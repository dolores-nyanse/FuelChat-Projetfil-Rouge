const messageInput = document.getElementById("messageInput");
const boutonEnvoyer = document.getElementById("boutonEnvoyer");
const listeMessages = document.getElementById("listeMessages");
const boutonNewChat = document.getElementById("boutonNewChat");
const listeChats = document.getElementById("listeChats");
const titreChat = document.getElementById("titreChat");
const statutChat = document.getElementById("statutChat");
const pointStatut = document.getElementById("pointStatut");
const avatarEntete = document.getElementById("avatarEntete");
const rechercheChat = document.getElementById("rechercheChat");
const boutonEmoji = document.getElementById("boutonEmoji");
const panneauEmoji = document.getElementById("panneauEmoji");

let utilisateurActuel = null;
let chats = [];
let chatActif = null;
let apercus = {};              // dernier message de chaque conversation
let dernierChatAffiche = null;

// Variables pour le statut (en ligne / en train d'écrire)
let canalPresence = null;
let utilisateursEnLigne = new Set();
let contactEcrit = false;
let minuterieEcriture = null;
let derniereEmissionEcriture = 0;

// ===== Petites icônes =====
const AVATAR_SVG = '<svg class="personne" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="#e9e6ff"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" fill="#e9e6ff"/></svg>';
const COCHE_SIMPLE = '<svg class="coche" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const COCHE_DOUBLE = '<svg class="coche" viewBox="0 0 24 24"><path d="M1 12.5l4.5 4.5L15 7.5"/><path d="M9 15.5l1.5 1.5L21 7.5"/></svg>';
const EMOJIS = ["😀", "😂", "😍", "😊", "😉", "😎", "🥲", "😭", "😡", "👍", "🙏", "👏", "🔥", "❤️", "💙", "🎉", "🚗", "🏍️", "⛽", "🔧", "🏁", "✅", "👀", "🤝"];

// ===== Outils =====

// Créer un avatar (avec une pastille verte si la personne est en ligne)
function creerAvatar(taille, enLigne) {
    const avatar = document.createElement("div");
    avatar.className = "avatar " + taille;
    avatar.innerHTML = AVATAR_SVG;

    if (enLigne) {
        const pastille = document.createElement("span");
        pastille.className = "pastille";
        avatar.appendChild(pastille);
    }
    return avatar;
}

// Transformer la date de Supabase en vraie date
function versDate(texte) {
    return new Date(/(Z|[+-]\d\d:?\d\d)$/.test(texte) ? texte : texte + "Z");
}

function formaterHeure(date) {
    return date.toLocaleTimeString("fr-CA", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
}

// Heure dans la liste : "01 h 07", "Hier", "mar.", ou la date
function formaterHeureListe(texte) {
    const date = versDate(texte);
    const maintenant = new Date();
    const debutAujourdhui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
    const debutJour = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const jours = Math.round((debutAujourdhui - debutJour) / 86400000);

    if (jours <= 0) return formaterHeure(date);
    if (jours === 1) return "Hier";
    if (jours < 7) return date.toLocaleDateString("fr-CA", { weekday: "short" });
    return date.toLocaleDateString("fr-CA");
}

// Nom et photo en haut de la conversation
function majEntete() {
    if (chatActif) {
        titreChat.textContent = chatActif.nom;
        avatarEntete.innerHTML = AVATAR_SVG;
        avatarEntete.style.visibility = "visible";
    } else {
        titreChat.textContent = "Choisissez une conversation";
        avatarEntete.innerHTML = "";
        avatarEntete.style.visibility = "hidden";
    }
}

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
    await chargerApercus();
    afficherListeChats();
    majEntete();

    await chargerMessages();

    demarrerPresence();
    afficherStatut();

    // Vérifier les nouveaux messages toutes les 3 secondes
    setInterval(rafraichir, 3000);
}

// Mettre à jour les messages et la liste des conversations
async function rafraichir() {
    await chargerMessages();
    await chargerApercus();
    afficherListeChats();
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
}

// Récupérer le dernier message de chaque conversation
async function chargerApercus() {
    if (!utilisateurActuel) {
        return;
    }

    const id = utilisateurActuel.id;

    const { data, error } = await supabaseClient
        .from("Messages")
        .select("*")
        .or(`sender_id.eq.${id},receiver_id.eq.${id}`)
        .order("created_at", { ascending: false })
        .limit(300);

    if (error) {
        console.error("Erreur aperçus :", error);
        return;
    }

    apercus = {};
    for (const m of data) {
        const autre = m.sender_id === id ? m.receiver_id : m.sender_id;
        if (!apercus[autre]) {
            apercus[autre] = m;
        }
    }
}

// Afficher la liste des conversations (photo, nom, dernier message, heure)
function afficherListeChats() {
    listeChats.innerHTML = "";

    const terme = rechercheChat.value.trim().toLowerCase();
    const liste = chats.filter(chat => chat.nom.toLowerCase().includes(terme));

    // Les plus récentes en premier
    liste.sort((a, b) => {
        const ma = apercus[a.id];
        const mb = apercus[b.id];
        if (ma && mb) return versDate(mb.created_at) - versDate(ma.created_at);
        if (ma) return -1;
        if (mb) return 1;
        return a.nom.localeCompare(b.nom);
    });

    if (liste.length === 0) {
        const vide = document.createElement("div");
        vide.className = "etatVide";
        vide.textContent = chats.length === 0 ? "Aucun contact. Ajoutez-en un !" : "Aucun résultat.";
        listeChats.appendChild(vide);
        return;
    }

    for (const chat of liste) {
        const dernier = apercus[chat.id];

        const item = document.createElement("button");
        item.type = "button";
        item.className = "itemChat";
        if (chatActif && chat.id === chatActif.id) {
            item.classList.add("actif");
        }
        item.addEventListener("click", () => ouvrirChat(chat.id));

        const infos = document.createElement("div");
        infos.className = "infosItem";

        const ligneNom = document.createElement("div");
        ligneNom.className = "ligneNom";

        const nom = document.createElement("span");
        nom.className = "nomItem";
        nom.textContent = chat.nom;

        const heure = document.createElement("span");
        heure.className = "heureItem";
        heure.textContent = dernier ? formaterHeureListe(dernier.created_at) : "";

        ligneNom.appendChild(nom);
        ligneNom.appendChild(heure);

        const apercu = document.createElement("div");
        apercu.className = "apercuItem";
        if (dernier) {
            const prefixe = dernier.sender_id === utilisateurActuel.id ? "Vous : " : "";
            apercu.textContent = prefixe + dernier.content;
        } else {
            apercu.textContent = "Aucun message";
        }

        infos.appendChild(ligneNom);
        infos.appendChild(apercu);

        item.appendChild(creerAvatar("", utilisateursEnLigne.has(chat.id)));
        item.appendChild(infos);
        listeChats.appendChild(item);
    }
}

// Chercher une conversation
rechercheChat.addEventListener("input", afficherListeChats);

// Ouvrir une conversation
async function ouvrirChat(id) {
    chatActif = chats.find(chat => chat.id === id);

    if (!chatActif) {
        return;
    }

    localStorage.setItem("contactActifId", chatActif.id);

    contactEcrit = false;
    majEntete();
    afficherStatut();
    afficherListeChats();
    await chargerMessages();
}

// Bouton Nouveau chat : choisir un contact
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

    // Si on a changé de conversation pendant le chargement, on arrête
    if (!chatActif || chatActif.id !== idContact) {
        return;
    }

    // Marquer comme "vus" les messages reçus (si la page est visible)
    const nonLus = data.filter(m => m.receiver_id === idUtilisateur && !m.lu);
    if (nonLus.length > 0 && document.visibilityState === "visible") {
        const { error: erreurLu } = await supabaseClient
            .from("Messages")
            .update({ lu: true })
            .eq("receiver_id", idUtilisateur)
            .eq("sender_id", idContact)
            .eq("lu", false);

        if (erreurLu) {
            console.error("Erreur 'vu' :", erreurLu);
        }
    }

    // Rester en bas seulement si on y était déjà (ou si on vient d'ouvrir le chat)
    const enBas = listeMessages.scrollHeight - listeMessages.scrollTop - listeMessages.clientHeight < 80;
    const premierAffichage = dernierChatAffiche !== idContact;
    dernierChatAffiche = idContact;

    listeMessages.innerHTML = "";

    if (data.length === 0) {
        const vide = document.createElement("div");
        vide.className = "etatVide";
        vide.textContent = "Aucun message. Écrivez le premier !";
        listeMessages.appendChild(vide);
        return;
    }

    for (const message of data) {
        const estEnvoye = message.sender_id === idUtilisateur;

        const rangee = document.createElement("div");
        rangee.className = "ligneMessage " + (estEnvoye ? "rangeeEnvoye" : "rangeeRecu");

        // Photo de l'autre personne à gauche de ses messages
        if (!estEnvoye) {
            rangee.appendChild(creerAvatar("petit", false));
        }

        const bulle = document.createElement("div");
        bulle.classList.add("message");
        bulle.classList.add(estEnvoye ? "message-envoye" : "message-recu");

        const contenu = document.createElement("div");
        contenu.className = "texteMessage";
        contenu.textContent = message.content;

        const meta = document.createElement("div");
        meta.className = "metaMessage";

        const heure = document.createElement("span");
        heure.textContent = formaterHeure(versDate(message.created_at));
        meta.appendChild(heure);

        // Sur mes messages : ✓ envoyé, ✓✓ vu
        if (estEnvoye) {
            const etat = document.createElement("span");
            etat.className = "etat" + (message.lu ? " vu" : "");
            etat.innerHTML = message.lu ? COCHE_DOUBLE : COCHE_SIMPLE;
            etat.title = message.lu ? "Vu" : "Envoyé";
            meta.appendChild(etat);
        }

        bulle.appendChild(contenu);
        bulle.appendChild(meta);
        rangee.appendChild(bulle);
        listeMessages.appendChild(rangee);
    }

    if (enBas || premierAffichage) {
        listeMessages.scrollTop = listeMessages.scrollHeight;
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
            alert("Choisissez d'abord un contact avec Nouveau chat.");
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
        messageInput.style.height = "auto";
        panneauEmoji.hidden = true;

        // J'arrête "en train d'écrire"
        derniereEmissionEcriture = 0;
        signalerEcriture(false);

        dernierChatAffiche = null; // pour descendre en bas
        await rafraichir();
    } catch (erreur) {
        boutonEnvoyer.disabled = false;
        alert("Problème à l'envoi : " + erreur.message);
    }
});

// Entrée = envoyer, Maj + Entrée = nouvelle ligne
messageInput.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Enter" && !evenement.shiftKey) {
        evenement.preventDefault();
        boutonEnvoyer.click();
    }
});

// La zone de texte grandit avec le message, et on prévient que j'écris
messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px";
    signalerEcriture(messageInput.value.trim() !== "");
});

// ===== Emojis =====
for (const emoji of EMOJIS) {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.textContent = emoji;
    bouton.addEventListener("click", () => {
        messageInput.value += emoji;
        messageInput.focus();
    });
    panneauEmoji.appendChild(bouton);
}

boutonEmoji.addEventListener("click", (evenement) => {
    evenement.stopPropagation();
    panneauEmoji.hidden = !panneauEmoji.hidden;
});

// Fermer le panneau en cliquant ailleurs
document.addEventListener("click", (evenement) => {
    if (!panneauEmoji.contains(evenement.target)) {
        panneauEmoji.hidden = true;
    }
});

// ===== En ligne / Hors-ligne / En train d'écrire =====

// Afficher le statut du contact ouvert (sous son nom)
function afficherStatut() {
    if (!chatActif) {
        statutChat.textContent = "";
        pointStatut.style.display = "none";
        return;
    }

    pointStatut.style.display = "inline-block";
    statutChat.className = "";

    if (contactEcrit) {
        statutChat.textContent = "est en train d'écrire…";
        statutChat.className = "ecrit";
        pointStatut.className = "enLigne";
    } else if (utilisateursEnLigne.has(chatActif.id)) {
        statutChat.textContent = "En ligne";
        pointStatut.className = "enLigne";
    } else {
        statutChat.textContent = "Hors-ligne";
        pointStatut.className = "horsLigne";
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
        afficherListeChats();
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

// ===== Lancer la page =====
initialiserConversation();