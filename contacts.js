
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

// Identifiant de l'utilisateur connecté
let utilisateurActuel = null;

// Initialiser la page Contacts
async function initialiserContacts() {
    utilisateurActuel = await verifierUtilisateur();

    if (!utilisateurActuel) {
        return;
    }

    await afficherContacts();
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

    for (const profil of data) {

        // Ne pas proposer son propre compte
        if (profil.id === utilisateurActuel.id) {
            continue;
        }

        const ligne = document.createElement("p");
        const nom = document.createElement("span");
        const boutonAjouter = document.createElement("button");

        nom.textContent = profil.username + " ";
        boutonAjouter.textContent = "Ajouter";
        boutonAjouter.type = "button";

        boutonAjouter.addEventListener("click", async function() {
            boutonAjouter.disabled = true;
            await ajouterContact(profil.id);
            boutonAjouter.disabled = false;
        });

        ligne.append(nom, boutonAjouter);
        resultatsRecherche.appendChild(ligne);
    }

    if (!resultatsRecherche.hasChildNodes()) {
        resultatsRecherche.textContent =
            "Aucun autre utilisateur trouvé.";
    }
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

// Activer le bouton Rechercher
boutonRecherche.addEventListener("click", rechercherContact);

// Démarrer la page
initialiserContacts();
