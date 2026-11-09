
// Connexion de la page Contacts à Supabase

const supabaseUrl = "https://zmgbizurbgqfkxpeknkx.supabase.co";
const supabaseKey = "sb_publishable_tIPrnyzU-b_Pocl5x8mo0w_ZHdjEsX0"; // cle publique 

const supabaseClient = window.supabase.createClient(
    supabaseUrl,
    supabaseKey
);

// Vérifie si l'utilisateur est connecté
async function verifierUtilisateur() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user) {
        alert("Veuillez vous connecter.");
        window.location.href = "index.html";
        return null;
    }

    console.log("Utilisateur connecté :", data.user.id);
    return data.user;
}

//    GESTION DES CONTACTS 

// Éléments HTML
const champRecherche = document.getElementById("rechercheContact");
const boutonRecherche = document.getElementById("boutonRecherche");
const resultatsRecherche = document.getElementById("resultatsRecherche");
const listeContacts = document.getElementById("listecontacts");
const invitationsRecues = document.getElementById("invitationsRecues");
const invitationsEnvoyees = document.getElementById("invitationsEnvoyees");

// Identifiant de l'utilisateur connecté
let utilisateurActuel = null;

// Initialiser la page Contacts
async function initialiserContacts() {
    utilisateurActuel = await verifierUtilisateur();

    if (!utilisateurActuel) {
        return;
    }

    await afficherContacts();
    await afficherInvitationsEnvoyees();
    await afficherInvitationsRecues();
}

// Rechercher un utilisateur par son nom
async function rechercherContact() {
    const nomRecherche = champRecherche.value.trim();

    resultatsRecherche.replaceChildren();

    if (nomRecherche === "") {
        alert("Veuillez saisir un nom d'utilisateur.");
        return;
    }

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("id, username")
        .ilike("username", nomRecherche);

    if (error) {
        console.error(error);
        alert("Erreur lors de la recherche.");
        return;
    }

    if (data.length === 0) {
        resultatsRecherche.textContent = "Aucun utilisateur trouvé.";
        return;
    }

     // Récupérer les identifiants des contacts déjà ajoutés
const { data: contactsExistants, error: erreurContacts } =
    await supabaseClient
        .from("contacts")
        .select("contact_id")
        .eq("user_id", utilisateurActuel.id);

if (erreurContacts) {
    console.error(erreurContacts);
    resultatsRecherche.textContent =
        "Impossible de vérifier les contacts existants.";
    return;
}

const idsContacts = new Set(
    contactsExistants.map(contact => contact.contact_id)
);

    for (const profil of data) {

        const ligne = document.createElement("p");
const nom = document.createElement("span");

nom.textContent = profil.username + " ";
ligne.appendChild(nom);

if (idsContacts.has(profil.id)) {
    // L'utilisateur est déjà dans les contacts
    const statut = document.createElement("span");
    statut.textContent = "✓ Déjà dans vos contacts";
    ligne.appendChild(statut);
} else {
    // L'utilisateur n'est pas encore dans les contacts
    const boutonAjouter = document.createElement("button");
    boutonAjouter.textContent = "Inviter";
    boutonAjouter.type = "button";

    boutonAjouter.addEventListener("click", async function() {
        boutonAjouter.disabled = true;
        await envoyerInvitation(profil.id);
        boutonAjouter.disabled = false;
    });

    ligne.appendChild(boutonAjouter);
}

resultatsRecherche.appendChild(ligne);
    }

    if (!resultatsRecherche.hasChildNodes()) {
        resultatsRecherche.textContent =
            "Aucun autre utilisateur trouvé.";
    }
}

// Envoyer une invitation de contact
async function envoyerInvitation(destinataireId) {

    const { error } = await supabaseClient
        .from("invitations_contacts")
        .insert({
            expediteur_id: utilisateurActuel.id,
            destinataire_id: destinataireId,
            statut: "en_attente"
        });

    if (error) {
        console.error(error);

        if (error.code === "23505") {
            alert("Une invitation est déjà en attente pour cet utilisateur.");
        } else {
            alert("Impossible d'envoyer l'invitation.");
        }
        return;
    }

    alert("Invitation envoyée avec succès !");
    resultatsRecherche.replaceChildren();
    champRecherche.value = "";
}

// Ajouter un contact dans Supabase
async function ajouterContact(contactId) {

    const { error } = await supabaseClient
        .from("contacts")
        .insert({
            user_id: utilisateurActuel.id,
            contact_id: contactId
        });

    if (error) {
        if (error.code === "23505") {
            alert("Cet utilisateur est déjà dans vos contacts.");
        } else {
            console.error(error);
            alert("Impossible d'ajouter ce contact.");
        }
        return;
    }

    alert("Contact ajouté avec succès !");
    resultatsRecherche.replaceChildren();
    champRecherche.value = "";

    await afficherContacts();
}

// Afficher les contacts enregistrés
async function afficherContacts() {

    listeContacts.textContent = "Chargement des contacts...";

    const { data, error } = await supabaseClient
        .from("contacts")
        .select("contact_id, profiles!contacts_contact_id_fkey(username)")
        .eq("user_id", utilisateurActuel.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        listeContacts.textContent =
            "Erreur de chargement des contacts.";
        return;
    }

    listeContacts.replaceChildren();

    if (data.length === 0) {
        listeContacts.textContent =
            "Vous n'avez pas encore de contacts.";
        return;
    }

    for (const contact of data) {
        const ligne = document.createElement("p");

        ligne.textContent =
            contact.profiles?.username ?? "Utilisateur inconnu";

        listeContacts.appendChild(ligne);
    }
}

// Afficher les invitations envoyées
async function afficherInvitationsEnvoyees() {
    invitationsEnvoyees.textContent = "Chargement des invitations...";

    const { data, error } = await supabaseClient
       .from("invitations_contacts")
       .select("destinataire_id, statut, created_at")
       .eq("expediteur_id", utilisateurActuel.id)
       .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        invitationsEnvoyees.textContent =
            "Erreur de chargement des invitations.";
        return;
    }

    const idsDestinataires = data.map(invitation => invitation.destinataire_id);

let profilsParId = new Map();

if (idsDestinataires.length > 0) {
    const { data: profils, error: erreurProfils } = await supabaseClient
        .from("profiles")
        .select("id, username")
        .in("id", idsDestinataires);

    if (erreurProfils) {
        console.error(erreurProfils);
        invitationsEnvoyees.textContent =
            "Impossible de récupérer les noms des destinataires.";
        return;
    }

    profilsParId = new Map(
        profils.map(profil => [profil.id, profil.username])
    );
}

    invitationsEnvoyees.replaceChildren();

    if (data.length === 0) {
        invitationsEnvoyees.textContent =
            "Aucune invitation envoyée.";
        return;
    }

    for (const invitation of data) {
        const ligne = document.createElement("p");

        const pseudo = profilsParId.get(invitation.destinataire_id)
    ?? "Utilisateur inconnu";

ligne.textContent =
    pseudo + " — Statut : " + invitation.statut;

        invitationsEnvoyees.appendChild(ligne);
    }
}


async function afficherInvitationsRecues() {
    invitationsRecues.textContent = "Chargement des invitations...";

    const { data, error } = await supabaseClient
        .from("invitations_contacts")
        .select("id, expediteur_id, statut, created_at")
        .eq("destinataire_id", utilisateurActuel.id)
        .eq("statut", "en_attente")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        invitationsRecues.textContent =
            "Erreur de chargement des invitations reçues.";
        return;
    }

    invitationsRecues.replaceChildren();

    if (data.length === 0) {
        invitationsRecues.textContent = "Aucune invitation reçue.";
        return;
    }

    const idsExpediteurs = data.map(invitation => invitation.expediteur_id);

    const { data: profils, error: erreurProfils } = await supabaseClient
        .from("profiles")
        .select("id, username")
        .in("id", idsExpediteurs);

    if (erreurProfils) {
        console.error(erreurProfils);
        invitationsRecues.textContent =
            "Impossible de récupérer les noms des expéditeurs.";
        return;
    }

    const profilsParId = new Map(
        profils.map(profil => [profil.id, profil.username])
    );

    for (const invitation of data) {
    const ligne = document.createElement("p");

    const pseudo = profilsParId.get(invitation.expediteur_id)
        ?? "Utilisateur inconnu";

    const nom = document.createElement("span");
    nom.textContent = pseudo + " ";

    const boutonAccepter = document.createElement("button");
    boutonAccepter.type = "button";
    boutonAccepter.textContent = "Accepter";

    const boutonRefuser = document.createElement("button");
    boutonRefuser.type = "button";
    boutonRefuser.textContent = "Refuser";

    async function repondre(accepter) {
        boutonAccepter.disabled = true;
        boutonRefuser.disabled = true;

        const { error } = await supabaseClient.rpc(
            "repondre_invitation",
            {
                p_invitation_id: invitation.id,
                p_accepter: accepter
            }
        );

        if (error) {
            console.error(error);
            alert("Impossible de traiter cette invitation.");

            boutonAccepter.disabled = false;
            boutonRefuser.disabled = false;
            return;
        }

        alert(accepter ? "Invitation acceptée !" : "Invitation refusée !");

        await afficherInvitationsRecues();
        await afficherContacts();
        await afficherInvitationsEnvoyees();
    }

    boutonAccepter.addEventListener("click", () => repondre(true));
    boutonRefuser.addEventListener("click", () => repondre(false));

    ligne.append(nom, boutonAccepter, boutonRefuser);
    invitationsRecues.appendChild(ligne);
}
}


// Activer le bouton Rechercher
boutonRecherche.addEventListener("click", rechercherContact);

// Démarrer la page
initialiserContacts();
