
/* ===== CHANGEMENT DU MOT DE PASSE ===== */

const supabaseUrl = "https://zmgbizurbgqfkxpeknkx.supabase.co";
const supabaseKey = "sb_publishable_tIPrnyzU-b_Pocl5x8mo0w_ZHdjEsX0";

const supabaseClient = window.supabase.createClient(
    supabaseUrl,
    supabaseKey
);

const formulaire = document.getElementById("formulaireNouveauMotDePasse");
const message = document.getElementById("messageNouveauPassword");

let recuperationValidee = false;

supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && session) {
        recuperationValidee = true;
        formulaire.hidden = false;
        message.textContent = "Lien validé. Saisissez votre nouveau mot de passe.";
    }
});

const fragments = new URLSearchParams(window.location.hash.substring(1));

if (fragments.has("error")) {
    message.textContent = "Lien invalide ou expiré. Demandez un nouveau lien.";
}

formulaire.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!recuperationValidee) {
        message.textContent = "Veuillez utiliser un lien de récupération valide.";
        return;
    }

    const password = document.getElementById("nouveauPassword").value;
    const bouton = formulaire.querySelector("button");

    bouton.disabled = true;

    const { error } = await supabaseClient.auth.updateUser({
        password: password
    });

    if (error) {
        message.textContent = "Impossible de modifier le mot de passe : " + error.message;
        bouton.disabled = false;
        return;
    }

    formulaire.hidden = true;
    message.textContent = "Mot de passe modifié ! Retournez à la connexion.";

    await supabaseClient.auth.signOut();
});
