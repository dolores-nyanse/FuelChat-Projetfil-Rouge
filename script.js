const messageInput = document.getElementById("messageInput");
const boutonEnvoyer = document.getElementById("boutonEnvoyer");
const listeMessages = document.getElementById("listeMessages");
const boutonNewChat = document.getElementById("boutonNewChat");
const listeChats = document.getElementById("listeChats");
const titreChat = document.getElementById("titreChat");
const statutChat = document.getElementById("statutChat");

let utilisateurActuel = null;
let chats = [];
let chatActif = null;

// Variables pour le statut (en ligne / en train d'écrire)
let canalPresence = null;
let utilisateursEnLigne = new Set();
let contactEcrit = false;
let minuterieEcriture = null;
let derniereEmissionEcriture = 0;

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

    if (!Number.isInteger(numero) || numero < 1 || numero > chats.length) {
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
        .select("*")
        .or(
            `and(sender_id.eq.${idUtilisateur},receiver_id.eq.${idContact}),and(sender_id.eq.${idContact},receiver_id.eq.${idUtilisateur})`
        )
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Erreur messages :", error);
        return;
    }

    // Marquer comme "vus" les messages reçus (si la page est visible)
    const nonLus = data.filter(m => m.receiver_id === idUtilisateur && !m.lu);
    if (nonLus.length > 0 && document.visibilityState === "visible") {
        await supabaseClient
            .from("Messages")
            .update({ lu: true })
            .eq("receiver_id", idUtilisateur)
            .eq("sender_id", idContact)
            .eq("lu", false);
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

        const estEnvoye = message.sender_id === idUtilisateur;

        if (estEnvoye) {
            ligne.classList.add("message-envoye");
        } else {
            ligne.classList.add("message-recu");
        }

        const contenu = document.createElement("div");
        contenu.textContent = message.content;

        const temps = document.createElement("small");
        temps.textContent = heure;

        // Sur mes messages : "✓ Envoyé" ou "✓✓ Vu"
        if (estEnvoye) {
            const etat = document.createElement("span");
            if (message.lu) {
                etat.textContent = " ✓✓ Vu";
                etat.style.color = "#ffe566";
                etat.style.fontWeight = "bold";
            } else {
                etat.textContent = " ✓ Envoyé";
            }
            temps.appendChild(etat);
        }

        ligne.appendChild(contenu);
        ligne.appendChild(temps);
        listeMessages.appendChild(ligne);
    }
}

// Envoyer un message
boutonEnvoyer.addEventListener("click", async function() {
    try {
        const texte = messageInput.value.trim();

        if (texte === "") {
            return;
        }

        if (!utilisateurActuel) {
            alert("Utilisateur non connecté. Recharge la page.");
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
            alert("Message non envoyé : " + error.message);
            return;
        }

        messageInput.value = "";

        // J'arrête "en train d'écrire"
        derniereEmissionEcriture = 0;
        signalerEcriture(false);

        await chargerMessages();
    } catch (erreur) {
        boutonEnvoyer.disabled = false;
        alert("Problème à l'envoi : " + erreur.message);
    }
});

// ===== En ligne / Hors-ligne / En train d'écrire =====

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
        statutChat.textContent = "● Hors-ligne";
        statutChat.style.color = "#999";
    }
}

// Se connecter au canal de présence
function demarrerPresence() {
    canalPresence = supabaseClient.channel("fuelchat-presence", {
        config: { presence: { key: utilisateurActuel.id } }
    });

    // Quelqu'un arrive ou part
    canalPresence.on("presence", { event: "sync" }, () => {
        const etat = canalPresence.presenceState();
        utilisateursEnLigne = new Set();

        for (const cle in etat) {
            utilisateursEnLigne.add(cle);
            for (const presence of etat[cle]) {
                if (presence.user_id) {
                    utilisateursEnLigne.add(presence.user_id);
                }
            }
        }
        afficherStatut();
    });

    // Quelqu'un est en train d'écrire (ou arrête)
    canalPresence.on("broadcast", { event: "ecriture" }, ({ payload }) => {
        if (!chatActif || payload.de !== chatActif.id || payload.pour !== utilisateurActuel.id) {
            return;
        }

        contactEcrit = payload.ecrit;
        afficherStatut();

        // Sécurité : sans nouveau signal pendant 3 s, on enlève "écrit…"
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
            await canalPresence.track({ user_id: utilisateurActuel.id });
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