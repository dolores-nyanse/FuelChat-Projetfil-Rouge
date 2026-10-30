const messageInput = document.getElementById("messageInput");
const boutonEnvoyer = document.getElementById("boutonEnvoyer");
const listeMessages = document.getElementById("listeMessages");
const boutonNewChat = document.getElementById("boutonNewChat");
const listeChats = document.getElementById("listeChats");
const titreChat = document.getElementById("titreChat");

let utilisateurActuel = null;
let chats = [];
let chatActif = null;

// ===== Variables pour le statut (en ligne / en train d'écrire) =====
let canalPresence = null;
let utilisateursEnLigne = new Set();
let contactEcrit = false;
let minuterieEcriture = null;
let derniereEmissionEcriture = 0;

// Petit texte sous le nom du chat (créé ici, pas besoin de toucher au HTML)
const statutChat = document.createElement("small");
statutChat.id = "statutChat";
titreChat.insertAdjacentElement("afterend", statutChat);

// ===== Démarrage de la page =====
async function initialiserConversation() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user) {
        alert("Veuillez vous connecter.");
        window.location.href = "index.html";
        return;
    }

    utilisateurActuel = data.user;

    await chargerContacts();

    // Afficher le nom du chat qui était ouvert
    if (chatActif) {
        titreChat.textContent = chatActif.nom;
    }

    await chargerMessages();

    demarrerPresence();
    afficherStatut();

    // Vérifier les nouveaux messages toutes les 3 secondes
    setInterval(chargerMessages, 3000);
}

// ===== Contacts =====
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
    contactEcrit = false;
    afficherStatut();
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

// ===== Messages =====

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

        const heure = new Date(message.created_at + "Z")
            .toLocaleTimeString("fr-CA", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            });

        ligne.classList.add("message");

        if (message.sender_id === idUtilisateur) {
            ligne.classList.add("message-envoye");
        } else {
            ligne.classList.add("message-recu");
        }

        const contenu = document.createElement("div");
        contenu.textContent = message.content;

        const temps = document.createElement("small");
        temps.textContent = heure;

        ligne.appendChild(contenu);
        ligne.appendChild(temps);
        listeMessages.appendChild(ligne);
    }
}

// Envoyer un message
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

    // J'arrête "en train d'écrire"
    derniereEmissionEcriture = 0;
    signalerEcriture(false);

    await chargerMessages();
});

// ===== En ligne / Hors connexion / En train d'écrire =====

// Afficher le statut du contact ouvert
function afficherStatut() {
    if (!chatActif) {
        statutChat.textContent = "";
        return;
    }

    if (contactEcrit) {
        statutChat.textContent = "est en train d'écrire…";
        statutChat.style.color = "#1fa8ca";
    } else if (utilisateursEnLigne.has(chatActif.id)) {
        statutChat.textContent = "● En ligne";
        statutChat.style.color = "#4cd964";
    } else {
        statutChat.textContent = "● Hors connexion";
        statutChat.style.color = "#999";
    }
    statutChat.style.display = "block";
    statutChat.style.textAlign = "center";
}

// Se connecter au canal de présence
function demarrerPresence() {
    canalPresence = supabaseClient.channel("fuelchat-presence", {
        config: { presence: { key: utilisateurActuel.id } }
    });

    // Quelqu'un arrive ou part : on met à jour la liste des gens en ligne
    canalPresence.on("presence", { event: "sync" }, () => {
        utilisateursEnLigne = new Set(Object.keys(canalPresence.presenceState()));
        afficherStatut();
    });

    // Quelqu'un est en train d'écrire (ou arrête)
    canalPresence.on("broadcast", { event: "ecriture" }, ({ payload }) => {
        // On ne réagit que si ça vient du contact ouvert et que c'est pour moi
        if (!chatActif || payload.de !== chatActif.id || payload.pour !== utilisateurActuel.id) {
            return;
        }

        contactEcrit = payload.ecrit;
        afficherStatut();

        // Sécurité : si on ne reçoit plus rien pendant 3 s, on enlève "écrit…"
        clearTimeout(minuterieEcriture);
        if (payload.ecrit) {
            minuterieEcriture = setTimeout(() => {
                contactEcrit = false;
                afficherStatut();
            }, 3000);
        }
    });

    canalPresence.subscribe(async (statut) => {
        if (statut === "SUBSCRIBED") {
            await canalPresence.track({ en_ligne: true });
        }
    });
}

// Prévenir le contact que j'écris (au maximum 1 fois toutes les 1,5 s)
function signalerEcriture(ecrit) {
    if (!canalPresence || !chatActif) {
        return;
    }

    const maintenant = Date.now();
    if (ecrit && maintenant - derniereEmissionEcriture < 1500) {
        return;
    }
    derniereEmissionEcriture = maintenant;

    canalPresence.send({
        type: "broadcast",
        event: "ecriture",
        payload: { de: utilisateurActuel.id, pour: chatActif.id, ecrit: ecrit }
    });
}

// Quand je tape dans la zone de texte
messageInput.addEventListener("input", () => {
    signalerEcriture(messageInput.value.trim() !== "");
});

// ===== Lancer la page =====
initialiserConversation();