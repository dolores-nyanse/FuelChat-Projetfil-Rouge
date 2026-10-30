
/* ===== PARAMÈTRES FUELCHAT ===== */

// Connexion à Supabase
const supabaseUrl = "https://zmgbizurbgqfkxpeknkx.supabase.co";

// Reprendre exactement la clé publique de auth.js
const supabaseKey = "sb_publishable_tIPrnyzU-b_Pocl5x8mo0w_ZHdjEsX0";

const supabaseClient = window.supabase.createClient(
    supabaseUrl,
    supabaseKey
);

// Récupérer les éléments HTML
const nomUtilisateur = document.getElementById("nomUtilisateur");
const courrielUtilisateur = document.getElementById("courrielUtilisateur");
const boutonDeconnexion = document.getElementById("boutonDeconnexion");

// Vérifier la connexion et afficher le compte
async function chargerParametres() {

    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user) {
        window.location.replace("index.html");
        return;
    }

    const utilisateur = data.user;

    // Afficher le courriel
    courrielUtilisateur.textContent = utilisateur.email;

    // Récupérer le nom d'utilisateur enregistré
    const { data: profil, error: erreurProfil } =
        await supabaseClient
            .from("profiles")
            .select("username")
            .eq("id", utilisateur.id)
            .maybeSingle();

    if (erreurProfil) {
        console.error("Erreur de lecture du profil :", erreurProfil);
        nomUtilisateur.textContent = "Indisponible";
    } else {
        nomUtilisateur.textContent =
            profil?.username || "Non défini";
    }
}

// Se déconnecter réellement de Supabase
async function deconnecter() {

    boutonDeconnexion.disabled = true;

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Erreur de déconnexion :", error);
        alert("Impossible de se déconnecter.");
        boutonDeconnexion.disabled = false;
        return;
    }

    window.location.replace("index.html");
}

// Activer le bouton de déconnexion
boutonDeconnexion.addEventListener("click", deconnecter);

// Démarrer la page
chargerParametres();
