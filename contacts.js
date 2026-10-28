
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

verifierUtilisateur();
