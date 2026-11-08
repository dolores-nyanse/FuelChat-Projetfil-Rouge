
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

const boutonFichier = document.getElementById("boutonFichier");
const fichierInput = document.getElementById("fichierInput");
const apercuFichier = document.getElementById("apercuFichier");
const nomFichier = document.getElementById("nomFichier");
const annulerFichier = document.getElementById("annulerFichier");

const BUCKET_FICHIERS = "fuelchat-fichiers";
const TAILLE_MAX_FICHIER = 10 * 1024 * 1024;

const TYPES_AUTORISES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
];

const EXTENSIONS_AUTORISEES = [
    "jpg", "jpeg", "png", "webp", "gif",
    "pdf", "doc", "docx", "txt",
    "xls", "xlsx", "ppt", "pptx"
];

let fichierSelectionne = null;
let envoiEnCours = false;
let suppressionEnCours = false;

let utilisateurActuel = null;
let chats = [];
let chatActif = null;
let apercus = {};
let dernierChatAffiche = null;

let canalPresence = null;
let utilisateursEnLigne = new Set();
let contactEcrit = false;
let minuterieEcriture = null;
let derniereEmissionEcriture = 0;

let notificationsInitialisees = false;
let dernierMessageConnu = 0;
let audioNotifications = null;
let minuterieNotification = null;

let cacheLiensFichiers = new Map();
let compteurAffichage = 0;

// Menu caché pour supprimer un message
let menuMessage = null;
let minuterieAppuiLong = null;
let appuiLongEffectue = false;

const AVATAR_SVG = '<svg class="personne" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="#e9e6ff"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" fill="#e9e6ff"/></svg>';

const COCHE_SIMPLE = '<svg class="coche" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

const COCHE_DOUBLE = '<svg class="coche" viewBox="0 0 24 24"><path d="M1 12.5l4.5 4.5L15 7.5"/><path d="M9 15.5l1.5 1.5L21 7.5"/></svg>';

const EMOJIS = [
    "😀", "😂", "😍", "😊", "😉", "😎",
    "🥲", "😭", "😡", "👍", "🙏", "👏",
    "🔥", "❤️", "💙", "🎉", "🚗", "🏍️",
    "⛽", "🔧", "🏁", "✅", "👀", "🤝"
];

// ===== OUTILS =====

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

function versDate(texte) {
    return new Date(
        /(Z|[+-]\d\d:?\d\d)$/.test(texte)
            ? texte
            : texte + "Z"
    );
}

function formaterHeure(date) {
    return date.toLocaleTimeString("fr-CA", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
}

function formaterHeureListe(texte) {
    const date = versDate(texte);
    const maintenant = new Date();

    const debutAujourdhui = new Date(
        maintenant.getFullYear(),
        maintenant.getMonth(),
        maintenant.getDate()
    );

    const debutJour = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );

    const jours = Math.round(
        (debutAujourdhui - debutJour) / 86400000
    );

    if (jours <= 0) return formaterHeure(date);
    if (jours === 1) return "Hier";

    if (jours < 7) {
        return date.toLocaleDateString("fr-CA", {
            weekday: "short"
        });
    }

    return date.toLocaleDateString("fr-CA");
}

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

// ===== DÉMARRAGE =====

async function initialiserConversation() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user) {
        window.location.replace("index.html");
        return;
    }

    document.getElementById("application").hidden = false;

    utilisateurActuel = data.user;

    await chargerContacts();
    await chargerApercus();
    afficherListeChats();
    majEntete();
    await chargerMessages();

    demarrerPresence();
    afficherStatut();

    setInterval(rafraichir, 3000);
}

async function rafraichir() {
    await chargerMessages();
    await chargerApercus();
    afficherListeChats();
}

// ===== CONTACTS =====

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

    const ancienId = localStorage.getItem("contactActifId");
    chatActif = chats.find(chat => chat.id === ancienId) || null;
}

async function chargerApercus() {
    if (!utilisateurActuel) return;

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

    verifierNotifications(data);

    apercus = {};

    for (const m of data) {
        const autre = m.sender_id === id
            ? m.receiver_id
            : m.sender_id;

        if (!apercus[autre]) {
            apercus[autre] = m;
        }
    }
}

function texteApercu(message) {
    if (!message) return "Aucun message";

    if (message.content && message.content.trim()) {
        return message.content;
    }

    if (message.fichier_chemin) {
        if (message.fichier_type?.startsWith("image/")) {
            return "📷 Photo";
        }

        return "📎 " + (message.fichier_nom || "Document");
    }

    return "Message";
}

function afficherListeChats() {
    listeChats.innerHTML = "";

    const terme = rechercheChat.value.trim().toLowerCase();

    const liste = chats.filter(chat =>
        chat.nom.toLowerCase().includes(terme)
    );

    liste.sort((a, b) => {
        const ma = apercus[a.id];
        const mb = apercus[b.id];

        if (ma && mb) {
            return versDate(mb.created_at) -
                versDate(ma.created_at);
        }

        if (ma) return -1;
        if (mb) return 1;

        return a.nom.localeCompare(b.nom);
    });

    if (liste.length === 0) {
        const vide = document.createElement("div");
        vide.className = "etatVide";

        vide.textContent = chats.length === 0
            ? "Aucun contact. Ajoutez-en un !"
            : "Aucun résultat.";

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

        heure.textContent = dernier
            ? formaterHeureListe(dernier.created_at)
            : "";

        ligneNom.appendChild(nom);
        ligneNom.appendChild(heure);

        const apercu = document.createElement("div");
        apercu.className = "apercuItem";

        if (dernier) {
            const prefixe =
                dernier.sender_id === utilisateurActuel.id
                    ? "Vous : "
                    : "";

            apercu.textContent = prefixe + texteApercu(dernier);
        } else {
            apercu.textContent = "Aucun message";
        }

        infos.appendChild(ligneNom);
        infos.appendChild(apercu);

        item.appendChild(
            creerAvatar("", utilisateursEnLigne.has(chat.id))
        );

        item.appendChild(infos);
        listeChats.appendChild(item);
    }
}

rechercheChat.addEventListener("input", afficherListeChats);

// ===== OUVRIR UNE CONVERSATION =====

async function ouvrirChat(id) {
    const nouveauChat = chats.find(chat => chat.id === id);

    if (!nouveauChat) return;

    fermerMenuMessage();

    if (!chatActif || chatActif.id !== nouveauChat.id) {
        if (chatActif && messageInput.value.trim() !== "") {
            signalerEcriture(false);
        }

        messageInput.value = "";
        messageInput.style.height = "auto";
        panneauEmoji.hidden = true;

        // Éviter de conserver une pièce jointe pour un autre contact
        annulerSelectionFichier();
    }

    chatActif = nouveauChat;

    localStorage.setItem("contactActifId", chatActif.id);

    contactEcrit = false;
    majEntete();
    afficherStatut();
    afficherListeChats();

    await chargerMessages();
}

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

    if (reponse === null) return;

    const numero = Number(reponse);

    if (!Number.isInteger(numero) ||
        numero < 1 ||
        numero > chats.length) {
        alert("Choix invalide.");
        return;
    }

    await ouvrirChat(chats[numero - 1].id);
});

// ===== PIÈCES JOINTES =====

boutonFichier.addEventListener("click", () => {
    if (!chatActif) {
        alert("Choisissez d'abord une conversation.");
        return;
    }

    fichierInput.click();
});

fichierInput.addEventListener("change", () => {
    const fichier = fichierInput.files[0];

    if (!fichier) return;

    const extension = fichier.name.split(".").pop().toLowerCase();

    if (!EXTENSIONS_AUTORISEES.includes(extension) ||
        !TYPES_AUTORISES.includes(fichier.type)) {
        alert("Ce type de fichier n'est pas autorisé.");
        annulerSelectionFichier();
        return;
    }

    if (fichier.size > TAILLE_MAX_FICHIER) {
        alert("Le fichier doit faire au maximum 10 Mo.");
        annulerSelectionFichier();
        return;
    }

    fichierSelectionne = fichier;

    nomFichier.textContent = "📎 " + fichier.name;
    apercuFichier.hidden = false;
});

function annulerSelectionFichier() {
    fichierSelectionne = null;
    fichierInput.value = "";
    nomFichier.textContent = "";
    apercuFichier.hidden = true;
}

annulerFichier.addEventListener("click", annulerSelectionFichier);

async function envoyerFichier(fichier, destinataireId) {
    const extension = fichier.name.split(".").pop().toLowerCase();

    const chemin =
        utilisateurActuel.id + "/" +
        destinataireId + "/" +
        crypto.randomUUID() + "." + extension;

    const { error } = await supabaseClient.storage
        .from(BUCKET_FICHIERS)
        .upload(chemin, fichier, {
            contentType: fichier.type,
            upsert: false
        });

    if (error) {
        throw new Error("Envoi du fichier : " + error.message);
    }

    return chemin;
}

async function obtenirLienFichier(chemin) {
    const maintenant = Date.now();
    const cache = cacheLiensFichiers.get(chemin);

    if (cache && cache.expiration > maintenant) {
        return cache.url;
    }

    const { data, error } = await supabaseClient.storage
        .from(BUCKET_FICHIERS)
        .createSignedUrl(chemin, 3600);

    if (error) {
        throw new Error(error.message);
    }

    cacheLiensFichiers.set(chemin, {
        url: data.signedUrl,
        expiration: maintenant + 50 * 60 * 1000
    });

    return data.signedUrl;
}

async function afficherPieceJointe(message, bulle, numeroAffichage) {
    if (!message.fichier_chemin) return;

    const conteneur = document.createElement("div");
    conteneur.textContent = "Chargement du fichier…";
    bulle.appendChild(conteneur);

    try {
        const lien = await obtenirLienFichier(message.fichier_chemin);

        if (numeroAffichage !== compteurAffichage) return;

        conteneur.textContent = "";

        if (message.fichier_type?.startsWith("image/")) {
            const image = document.createElement("img");
            image.className = "imageMessage";
            image.src = lien;
            image.alt = message.fichier_nom || "Photo";
            image.loading = "lazy";

            image.addEventListener("click", () => {
                window.open(lien, "_blank", "noopener,noreferrer");
            });

            conteneur.appendChild(image);

        } else {
            const documentLien = document.createElement("a");
            documentLien.className = "documentMessage";
            documentLien.href = lien;
            documentLien.target = "_blank";
            documentLien.rel = "noopener noreferrer";

            documentLien.textContent =
                "📎 " + (message.fichier_nom || "Télécharger le document");

            conteneur.appendChild(documentLien);
        }

    } catch (erreur) {
        console.error("Fichier :", erreur);

        if (numeroAffichage === compteurAffichage) {
            conteneur.textContent = "Fichier indisponible";
        }
    }
}

// ===== MENU CACHÉ DES MESSAGES =====

// Le menu est créé en JavaScript.
// Aucun changement nécessaire dans conversation.html.

function fermerMenuMessage() {
    if (menuMessage) {
        menuMessage.remove();
        menuMessage = null;
    }
}

function ouvrirMenuMessage(message, x, y) {
    if (!utilisateurActuel) return;

    // Le menu n'est accessible que sur les messages envoyés.
    if (message.sender_id !== utilisateurActuel.id) return;

    fermerMenuMessage();

    menuMessage = document.createElement("div");
    menuMessage.id = "menuMessageFuelChat";

    menuMessage.style.cssText = `
        position: fixed;
        z-index: 10000;
        min-width: 155px;
        padding: 6px;
        border-radius: 12px;
        background: #ffffff;
        border: 1px solid #dce5f0;
        box-shadow: 0 8px 28px rgba(0,0,0,0.22);
        font-family: Arial, sans-serif;
    `;

    const boutonSupprimer = document.createElement("button");
    boutonSupprimer.type = "button";
    boutonSupprimer.textContent = "🗑️ Supprimer";

    boutonSupprimer.style.cssText = `
        display: block;
        width: 100%;
        padding: 11px 13px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: #d32f2f;
        font-size: 14px;
        font-family: inherit;
        text-align: left;
        cursor: pointer;
    `;

    boutonSupprimer.addEventListener("mouseenter", () => {
        boutonSupprimer.style.background = "#fff0f0";
    });

    boutonSupprimer.addEventListener("mouseleave", () => {
        boutonSupprimer.style.background = "transparent";
    });

    boutonSupprimer.addEventListener("click", function(evenement) {
        evenement.stopPropagation();

        fermerMenuMessage();

        supprimerMessage(message.id, message.sender_id);
    });

    menuMessage.appendChild(boutonSupprimer);
    document.body.appendChild(menuMessage);

    // Garder le menu à l'intérieur de l'écran.
    const largeur = menuMessage.offsetWidth;
    const hauteur = menuMessage.offsetHeight;

    const positionX = Math.max(
        8,
        Math.min(x, window.innerWidth - largeur - 8)
    );

    const positionY = Math.max(
        8,
        Math.min(y, window.innerHeight - hauteur - 8)
    );

    menuMessage.style.left = positionX + "px";
    menuMessage.style.top = positionY + "px";
}

// Fermer le menu si on clique ailleurs.
document.addEventListener("pointerdown", function(evenement) {
    if (
        menuMessage &&
        !menuMessage.contains(evenement.target)
    ) {
        fermerMenuMessage();
    }
});

// Fermer le menu avec Échap.
document.addEventListener("keydown", function(evenement) {
    if (evenement.key === "Escape") {
        fermerMenuMessage();
    }
});

// Fermer le menu lorsqu'on défile.
listeMessages.addEventListener("scroll", fermerMenuMessage);

window.addEventListener("resize", fermerMenuMessage);

// Associer clic droit et appui prolongé à une bulle.
function activerMenuSurMessage(bulle, message) {
    if (message.sender_id !== utilisateurActuel.id) return;

    // Ordinateur : clic droit.
    bulle.addEventListener("contextmenu", function(evenement) {
        evenement.preventDefault();

        ouvrirMenuMessage(
            message,
            evenement.clientX,
            evenement.clientY
        );
    });

    // Téléphone : appui prolongé.
    bulle.addEventListener("touchstart", function(evenement) {
        appuiLongEffectue = false;

        clearTimeout(minuterieAppuiLong);

        const toucher = evenement.touches[0];
        if (!toucher) return;

        const x = toucher.clientX;
        const y = toucher.clientY;

        minuterieAppuiLong = setTimeout(function() {
            appuiLongEffectue = true;
            ouvrirMenuMessage(message, x, y);
        }, 550);

    }, { passive: true });

    bulle.addEventListener("touchmove", function() {
        clearTimeout(minuterieAppuiLong);
    }, { passive: true });

    bulle.addEventListener("touchend", function() {
        clearTimeout(minuterieAppuiLong);
    });

    bulle.addEventListener("touchcancel", function() {
        clearTimeout(minuterieAppuiLong);
    });

    // Empêcher un clic accidentel après l'appui prolongé.
    bulle.addEventListener("click", function(evenement) {
        if (appuiLongEffectue) {
            evenement.preventDefault();
            evenement.stopPropagation();
            appuiLongEffectue = false;
        }
    }, true);
}

// ===== SUPPRIMER UN MESSAGE =====

async function supprimerMessage(messageId, expediteurId) {
    if (!utilisateurActuel) return;

    if (expediteurId !== utilisateurActuel.id) {
        alert("Vous ne pouvez supprimer que vos propres messages.");
        return;
    }

    if (suppressionEnCours) return;

    const confirmation = confirm(
        "Voulez-vous vraiment supprimer ce message ?\n\n" +
        "Il disparaîtra de votre conversation et de celle du destinataire."
    );

    if (!confirmation) return;

    suppressionEnCours = true;

    try {
        const { data, error } = await supabaseClient
            .from("Messages")
            .delete()
            .eq("id", messageId)
            .eq("sender_id", utilisateurActuel.id)
            .select("id");

        if (error) {
            throw new Error(error.message);
        }

        if (!data || data.length === 0) {
            alert(
                "Le message n'a pas été supprimé. " +
                "Vérifiez la politique DELETE dans Supabase."
            );
            return;
        }

        fermerMenuMessage();

        dernierChatAffiche = null;
        await rafraichir();

    } catch (erreur) {
        console.error("Erreur suppression :", erreur);

        alert(
            "Impossible de supprimer le message : " +
            erreur.message
        );

    } finally {
        suppressionEnCours = false;
    }
}

// ===== AFFICHER LES MESSAGES =====

async function chargerMessages() {
    if (!utilisateurActuel || !chatActif) return;

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

    if (!chatActif || chatActif.id !== idContact) return;

    const nonLus = data.filter(
        m => m.receiver_id === idUtilisateur && !m.lu
    );

    if (nonLus.length > 0 &&
        document.visibilityState === "visible") {

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

    const enBas =
        listeMessages.scrollHeight -
        listeMessages.scrollTop -
        listeMessages.clientHeight < 80;

    const premierAffichage = dernierChatAffiche !== idContact;

    dernierChatAffiche = idContact;
    compteurAffichage++;

    const numeroAffichage = compteurAffichage;

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
        rangee.className = "ligneMessage " +
            (estEnvoye ? "rangeeEnvoye" : "rangeeRecu");

        if (!estEnvoye) {
            rangee.appendChild(creerAvatar("petit", false));
        }

        const bulle = document.createElement("div");
        bulle.classList.add("message");
        bulle.classList.add(
            estEnvoye ? "message-envoye" : "message-recu"
        );

        // Texte du message
        if (message.content && message.content.trim()) {
            const contenu = document.createElement("div");
            contenu.className = "texteMessage";
            contenu.textContent = message.content;
            bulle.appendChild(contenu);
        }

        // Photo ou document
        if (message.fichier_chemin) {
            afficherPieceJointe(message, bulle, numeroAffichage);
        }

        const meta = document.createElement("div");
        meta.className = "metaMessage";

        const heure = document.createElement("span");
        heure.textContent = formaterHeure(
            versDate(message.created_at)
        );

        meta.appendChild(heure);

        if (estEnvoye) {
            const etat = document.createElement("span");
            etat.className = "etat" + (message.lu ? " vu" : "");

            etat.innerHTML = message.lu
                ? COCHE_DOUBLE
                : COCHE_SIMPLE;

            etat.title = message.lu ? "Vu" : "Envoyé";
            meta.appendChild(etat);

            // Aucun bouton Supprimer visible ici.
            // L'option est cachée dans le menu contextuel.
            activerMenuSurMessage(bulle, message);
        }

        bulle.appendChild(meta);
        rangee.appendChild(bulle);
        listeMessages.appendChild(rangee);
    }

    if (enBas || premierAffichage) {
        listeMessages.scrollTop = listeMessages.scrollHeight;
    }
}

// ===== ENVOYER UN MESSAGE OU UN FICHIER =====

boutonEnvoyer.addEventListener("click", async function() {
    if (envoiEnCours) return;

    const texte = messageInput.value.trim();
    const fichier = fichierSelectionne;

    if (texte === "" && !fichier) return;

    if (!utilisateurActuel) {
        alert("Utilisateur non connecté. Recharge la page.");
        return;
    }

    if (!chatActif) {
        alert("Choisissez d'abord un contact avec Nouveau chat.");
        return;
    }

    const destinataireId = chatActif.id;
    let cheminFichier = null;

    try {
        envoiEnCours = true;
        boutonEnvoyer.disabled = true;
        boutonEnvoyer.title = "Envoi en cours…";

        if (fichier) {
            cheminFichier = await envoyerFichier(
                fichier,
                destinataireId
            );
        }

        const nouveauMessage = {
            sender_id: utilisateurActuel.id,
            receiver_id: destinataireId,
            content: texte
        };

        if (fichier) {
            nouveauMessage.fichier_chemin = cheminFichier;
            nouveauMessage.fichier_nom = fichier.name;
            nouveauMessage.fichier_type = fichier.type;
        }

        const { error } = await supabaseClient
            .from("Messages")
            .insert(nouveauMessage);

        if (error) {
            throw new Error(error.message);
        }

        messageInput.value = "";
        messageInput.style.height = "auto";
        annulerSelectionFichier();
        panneauEmoji.hidden = true;

        derniereEmissionEcriture = 0;
        signalerEcriture(false);

        dernierChatAffiche = null;
        await rafraichir();

    } catch (erreur) {
        console.error("Erreur envoi :", erreur);

        alert(
            "Impossible d'envoyer le message : " +
            erreur.message
        );

    } finally {
        envoiEnCours = false;
        boutonEnvoyer.disabled = false;
        boutonEnvoyer.title = "Envoyer";
    }
});

// ===== TOUCHE ENTRÉE =====

// Entrée : envoyer
// Maj + Entrée : retour à la ligne

messageInput.addEventListener("keydown", (evenement) => {
    if (
        evenement.key === "Enter" &&
        !evenement.shiftKey &&
        !evenement.isComposing &&
        evenement.keyCode !== 229
    ) {
        evenement.preventDefault();
        boutonEnvoyer.click();
    }
});

messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height =
        Math.min(messageInput.scrollHeight, 120) + "px";

    signalerEcriture(messageInput.value.trim() !== "");
});

// ===== EMOJIS =====

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

document.addEventListener("click", (evenement) => {
    if (!panneauEmoji.contains(evenement.target)) {
        panneauEmoji.hidden = true;
    }
});

// ===== EN LIGNE / HORS LIGNE / ÉCRITURE =====

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

function demarrerPresence() {
    canalPresence = supabaseClient.channel(
        "fuelchat-presence",
        {
            config: {
                presence: {
                    key: utilisateurActuel.id
                }
            }
        }
    );

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

    canalPresence.on(
        "broadcast",
        { event: "ecriture" },
        ({ payload }) => {
            if (!chatActif ||
                payload.de !== chatActif.id ||
                payload.pour !== utilisateurActuel.id) {
                return;
            }

            contactEcrit = payload.ecrit;
            afficherStatut();

            clearTimeout(minuterieEcriture);

            if (payload.ecrit) {
                minuterieEcriture = setTimeout(() => {
                    contactEcrit = false;
                    afficherStatut();
                }, 3000);
            }
        }
    );

    canalPresence.subscribe(async (statut) => {
        if (statut === "SUBSCRIBED") {
            await canalPresence.track({
                user_id: utilisateurActuel.id
            });
        }
    });
}

function signalerEcriture(ecrit) {
    if (!canalPresence || !chatActif) return;

    const maintenant = Date.now();

    if (ecrit &&
        maintenant - derniereEmissionEcriture < 1500) {
        return;
    }

    derniereEmissionEcriture = maintenant;

    canalPresence.send({
        type: "broadcast",
        event: "ecriture",
        payload: {
            de: utilisateurActuel.id,
            pour: chatActif.id,
            ecrit: ecrit
        }
    });
}

// ===== NOTIFICATIONS VISUELLES =====

function afficherNotification(message, nom) {
    if (localStorage.getItem("notificationVisuelle") !== "true") {
        return;
    }

    let boite = document.getElementById("alerteFuelChat");

    if (!boite) {
        boite = document.createElement("div");
        boite.id = "alerteFuelChat";

        boite.style.cssText = `
            position: fixed;
            top: 24px;
            right: 24px;
            z-index: 9999;
            width: 380px;
            max-width: calc(100vw - 48px);
            box-sizing: border-box;
            padding: 20px 22px;
            border-radius: 18px;
            background: #18334c;
            color: white;
            border: 2px solid #27b8ff;
            box-shadow: 0 10px 35px rgba(0,0,0,0.55);
            font-family: Arial, sans-serif;
            overflow-wrap: anywhere;
        `;

        document.body.appendChild(boite);
    }

    boite.innerHTML = "";

    const ligne = document.createElement("div");
    ligne.style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: 14px;
    `;

    const icone = document.createElement("div");
    icone.textContent = "🔔";
    icone.style.cssText = `
        font-size: 28px;
        flex-shrink: 0;
    `;

    const textes = document.createElement("div");
    textes.style.cssText = `
        flex: 1;
        min-width: 0;
    `;

    const titre = document.createElement("div");
    titre.textContent = "Nouveau message !";
    titre.style.cssText = `
        font-size: 17px;
        font-weight: bold;
        color: #ffffff;
        margin-bottom: 7px;
    `;

    const expediteur = document.createElement("div");
    expediteur.textContent = nom;
    expediteur.style.cssText = `
        font-size: 16px;
        font-weight: bold;
        color: #56c5ff;
        margin-bottom: 5px;
    `;

    const contenu = document.createElement("div");
    contenu.textContent = texteApercu(message);
    contenu.style.cssText = `
        font-size: 15px;
        line-height: 1.5;
        color: #e1edf8;
        max-height: 100px;
        overflow: hidden;
    `;

    textes.appendChild(titre);
    textes.appendChild(expediteur);
    textes.appendChild(contenu);

    ligne.appendChild(icone);
    ligne.appendChild(textes);
    boite.appendChild(ligne);

    boite.style.display = "block";

    clearTimeout(minuterieNotification);

    minuterieNotification = setTimeout(() => {
        boite.style.display = "none";
    }, 8000);
}

// ===== CLOCHE CRISTALLINE =====

function jouerNote(frequence, debut, duree) {
    const oscillateur = audioNotifications.createOscillator();
    const volume = audioNotifications.createGain();

    oscillateur.type = "sine";
    oscillateur.frequency.setValueAtTime(frequence, debut);

    volume.gain.setValueAtTime(0.001, debut);

    volume.gain.exponentialRampToValueAtTime(
        0.22,
        debut + 0.015
    );

    volume.gain.exponentialRampToValueAtTime(
        0.001,
        debut + duree
    );

    oscillateur.connect(volume);
    volume.connect(audioNotifications.destination);

    oscillateur.start(debut);
    oscillateur.stop(debut + duree);
}

function jouerSonNotification() {
    if (localStorage.getItem("notificationSonore") !== "true") {
        return;
    }

    try {
        const ContexteAudio =
            window.AudioContext || window.webkitAudioContext;

        if (!ContexteAudio) return;

        if (!audioNotifications) {
            audioNotifications = new ContexteAudio();
        }

        if (audioNotifications.state !== "running") {
            audioNotifications.resume().catch(() => {});
            return;
        }

        const debut = audioNotifications.currentTime + 0.02;

        jouerNote(1318.51, debut, 0.24);
        jouerNote(1567.98, debut + 0.16, 0.38);

    } catch (erreur) {
        console.warn("Son non disponible :", erreur);
    }
}

document.addEventListener("click", () => {
    if (localStorage.getItem("notificationSonore") !== "true") {
        return;
    }

    const ContexteAudio =
        window.AudioContext || window.webkitAudioContext;

    if (!ContexteAudio) return;

    try {
        if (!audioNotifications) {
            audioNotifications = new ContexteAudio();
        }

        if (audioNotifications.state === "suspended") {
            audioNotifications.resume().catch(() => {});
        }

    } catch (erreur) {
        console.warn("Audio non disponible :", erreur);
    }
});

// ===== DÉTECTER LES NOUVEAUX MESSAGES =====

function verifierNotifications(messages) {
    if (!notificationsInitialisees) {
        for (const message of messages) {
            const date = versDate(message.created_at).getTime();

            if (date > dernierMessageConnu) {
                dernierMessageConnu = date;
            }
        }

        notificationsInitialisees = true;
        return;
    }

    const nouveaux = messages.filter(message =>
        message.receiver_id === utilisateurActuel.id &&
        versDate(message.created_at).getTime() > dernierMessageConnu
    );

    for (const message of messages) {
        const date = versDate(message.created_at).getTime();

        if (date > dernierMessageConnu) {
            dernierMessageConnu = date;
        }
    }

    if (nouveaux.length === 0) return;

    const dernier = nouveaux[0];

    const contact = chats.find(
        chat => chat.id === dernier.sender_id
    );

    const nom = contact
        ? contact.nom
        : "Nouveau contact";

    afficherNotification(dernier, nom);
    jouerSonNotification();
}

// ===== LANCER FUELCHAT =====

initialiserConversation();

// ===== AFFICHAGE TÉLÉPHONE : LISTE / DISCUSSION =====

(function () {
    const application = document.getElementById("application");
    const boutonRetourListe = document.getElementById("boutonRetourListe");

    if (!application || !boutonRetourListe) return;

    let nouveauChatDemande = 0;

    function ouvrirDiscussion() {
        application.classList.add("vueDiscussion");
    }

    function afficherListe() {
        application.classList.remove("vueDiscussion");
    }

    document.addEventListener("click", (evenement) => {
        if (evenement.target.closest(".itemChat")) {
            ouvrirDiscussion();
        } else if (evenement.target.closest("#boutonNewChat")) {
            nouveauChatDemande = Date.now();
        }
    }, true);

    new MutationObserver(() => {
        if (
            nouveauChatDemande &&
            Date.now() - nouveauChatDemande < 30000
        ) {
            nouveauChatDemande = 0;
            ouvrirDiscussion();
        }
    }).observe(titreChat, {
        childList: true,
        characterData: true,
        subtree: true
    });

    boutonRetourListe.addEventListener("click", afficherListe);
})();
