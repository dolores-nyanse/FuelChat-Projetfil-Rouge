const messageInput = document.getElementById("messageInput");
const boutonEnvoyer = document.getElementById("boutonEnvoyer");
const listeMessages = document.getElementById("listeMessages");

// AJOUT : éléments pour les chats
const boutonNewChat = document.getElementById("boutonNewChat");
const listeChats = document.getElementById("listeChats");
const titreChat = document.getElementById("titreChat");

// AJOUT : récupérer les chats sauvegardés
// Structure : [{ id, nom, messages: [{ texte, heure }] }]
let chats = JSON.parse(localStorage.getItem("chats")) || [];

// AJOUT : si aucun chat, en créer un premier
// (on y récupère les anciens messages sauvegardés avec l'ancienne version)
if (chats.length === 0) {
    const anciensMessages = JSON.parse(localStorage.getItem("messages")) || [];
    chats.push({ id: Date.now().toString(), nom: "Chat 1", messages: anciensMessages });
}

// AJOUT : chat actuellement ouvert
let chatActif = chats.find((chat) => chat.id === localStorage.getItem("chatActifId")) || chats[chats.length - 1];

// Récupérer les messages sauvegardés (ceux du chat ouvert)
let messages = chatActif.messages;

// AJOUT : tout sauvegarder
function sauvegarder() {
    localStorage.setItem("chats", JSON.stringify(chats));
    localStorage.setItem("chatActifId", chatActif.id);
}

// Afficher les messages sauvegardés
function afficherMessages() {
    listeMessages.innerHTML = "";
    titreChat.textContent = chatActif.nom;

    for (const message of messages) {
        const ancienMessage = document.createElement("div");
        ancienMessage.textContent = message.texte + " - " + message.heure;
        listeMessages.appendChild(ancienMessage);
    }
}

// AJOUT : afficher la liste des chats (chaque chat est un bouton)
function afficherListeChats() {
    listeChats.innerHTML = "";

    for (const chat of chats) {
        const bouton = document.createElement("button");
        bouton.textContent = chat.nom;
        if (chat.id === chatActif.id) {
            bouton.classList.add("chatActif");
        }
        bouton.addEventListener("click", () => ouvrirChat(chat.id));

        const conteneur = document.createElement("div");
        conteneur.appendChild(bouton);
        listeChats.appendChild(conteneur);
    }
}

// AJOUT : ouvrir un chat de la liste
function ouvrirChat(id) {
    chatActif = chats.find((chat) => chat.id === id);
    messages = chatActif.messages;
    sauvegarder();
    afficherListeChats();
    afficherMessages();
}

// AJOUT : New Chat
boutonNewChat.addEventListener("click", () => {
    const nomParDefaut = "Chat " + (chats.length + 1);
    const nom = prompt("Nom du nouveau chat :", nomParDefaut);

    if (nom === null) {
        return; // annulé
    }

    const nouveauChat = { id: Date.now().toString(), nom: nom.trim() || nomParDefaut, messages: [] };
    chats.push(nouveauChat);
    ouvrirChat(nouveauChat.id);
});

// Envoyer un message
boutonEnvoyer.addEventListener("click", () => {
    const message = messageInput.value;

    if (message.trim() !== "") {

        // Récupérer l'heure actuelle
        const heure = new Date().toLocaleTimeString("fr-CA", {
            hour: "2-digit",
            minute: "2-digit"
        });

        const nouveauMessage = document.createElement("div");
        nouveauMessage.textContent = message + " - " + heure;
        listeMessages.appendChild(nouveauMessage);

        // Enregistrer le texte et l'heure (dans le chat ouvert)
        messages.push({ texte: message, heure: heure });
        sauvegarder();

        messageInput.value = "";
    }
});

// AJOUT : affichage au chargement de la page
sauvegarder();
afficherListeChats();
afficherMessages();

