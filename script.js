
const messageInput = document.getElementById("messageInput");
const boutonEnvoyer = document.getElementById("boutonEnvoyer");
const listeMessages = document.getElementById("listeMessages");
const boutonNewChat = document.getElementById("boutonNewChat");
const listeChats = document.getElementById("listeChats");
const titreChat = document.getElementById("titreChat");

let utilisateurActuel = null;
let chats = [];
let chatActif = null;

// Vérifier la connexion de l'utilisateur
async function initialiserConversation() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user) {
        alert("Veuillez vous connecter.");
        window.location.href = "index.html";
        return;
    }

    utilisateurActuel = data.user;

    await chargerContacts();
    await chargerMessages();

    // Vérifier les nouveaux messages toutes les 3 secondes
    setInterval(chargerMessages, 3000);
}

// Récupérer les contacts depuis Supabase
async function chargerContacts() {
    const { data, error } = await supabaseClient
        .from("contacts")
        .select("contact_id, profiles!contacts_contact_id_fkey(username)")
        .eq("user_id", utilisateurActuel.id);

    if (error) {
        console.error("Erreur contacts :", error);
        alert("Impossible de charger les contacts.");
        return;
    }

    chats = data.map(contact => ({
        id: contact.contact_id,
        nom: contact.profiles?.username || "Utilisateur"
    }));

    // Garder le chat précédemment ouvert
    const ancienId = localStorage.getItem("contactActifId");
    chatActif = chats.find(chat => chat.id === ancienId) || null;

    afficherListeChats();
}

// Afficher les contacts dans la liste des chats
function afficherListeChats() {
    listeChats.innerHTML = "";

    for (const chat of chats) {
        const bouton = document.createElement("button");
        bouton.textContent = chat.nom;

        if (chatActif && chat.id === chatActif.id) {
            bouton.classList.add("chatActif");
        }

        bouton.addEventListener("click", () => ouvrirChat(chat.id));

        const conteneur = document.createElement("div");
        conteneur.appendChild(bouton);
        listeChats.appendChild(conteneur);
    }
}

// Ouvrir une conversation
async function ouvrirChat(id) {
    chatActif = chats.find(chat => chat.id === id);

    if (!chatActif) {
        return;
    }

    localStorage.setItem("contactActifId", chatActif.id);

    titreChat.textContent = chatActif.nom;
    afficherListeChats();
    await chargerMessages();
}

// Bouton New Chat : choisir un contact
boutonNewChat.addEventListener("click", async function() {
    await chargerContacts();

    if (chats.length === 0) {
        alert("Ajoutez d'abord un contact dans la page Contacts.");
        return;
    }

    let choix = "Choisissez un contact :\n";

    for (let i = 0; i < chats.length; i++) {
        choix += (i + 1) + ". " + chats[i].nom + "\n";
    }

    const reponse = prompt(choix);

    if (reponse === null) {
        return;
    }

    const numero = Number(reponse);

    if (!Number.isInteger(numero) ||
        numero < 1 || numero > chats.length) {
        alert("Choix invalide.");
        return;
    }

    await ouvrirChat(chats[numero - 1].id);
});

// Charger les messages envoyés ET reçus
async function chargerMessages() {
    if (!utilisateurActuel || !chatActif) {
        return;
    }

    const idUtilisateur = utilisateurActuel.id;
    const idContact = chatActif.id;

    const { data, error } = await supabaseClient
        .from("Messages")
        .select("id, sender_id, receiver_id, content, created_at")
        .or(
            `and(sender_id.eq.${idUtilisateur},receiver_id.eq.${idContact}),and(sender_id.eq.${idContact},receiver_id.eq.${idUtilisateur})`
        )
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Erreur messages :", error);
        return;
    }

    listeMessages.innerHTML = "";

    for (const message of data) {
        const ligne = document.createElement("div");

        const heure = new Date(message.created_at)
    .toLocaleTimeString("fr-CA", {
        timeZone: "America/Toronto",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });

        const auteur = message.sender_id === idUtilisateur
            ? "Moi"
            : chatActif.nom;

        ligne.textContent =
            auteur + " : " + message.content + " - " + heure;

        listeMessages.appendChild(ligne);
    }
}

// Envoyer un message à un vrai contact
boutonEnvoyer.addEventListener("click", async function() {
    const texte = messageInput.value.trim();

    if (texte === "") {
        return;
    }

    if (!chatActif) {
        alert("Choisissez d'abord un contact avec New Chat.");
        return;
    }

    boutonEnvoyer.disabled = true;

    const { error } = await supabaseClient
        .from("Messages")
        .insert({
            sender_id: utilisateurActuel.id,
            receiver_id: chatActif.id,
            content: texte
        });

    boutonEnvoyer.disabled = false;

    if (error) {
        console.error("Erreur envoi :", error);
        alert("Message non envoyé : " + error.message);
        return;
    }

    messageInput.value = "";
    await chargerMessages();
});

// Démarrer la page Conversation
initialiserConversation();
