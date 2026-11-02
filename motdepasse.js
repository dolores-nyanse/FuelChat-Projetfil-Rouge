
/* ===== RÉCUPÉRATION DU MOT DE PASSE FUELCHAT ===== */

// Reprendre les informations publiques de auth.js
const supabaseUrl = "https://zmgbizurbgqfkxpeknkx.supabase.co";
const supabaseKey = "sb_publishable_tIPrnyzU-b_Pocl5x8mo0w_ZHdjEsX0";

const supabaseClient = window.supabase.createClient(
    supabaseUrl,
    supabaseKey
);

const formulaire = document.getElementById("formulaireRecuperation");
const champEmail = document.getElementById("emailRecuperation");
const message = document.getElementById("messageRecuperation");

formulaire.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = champEmail.value.trim();

    if (!champEmail.checkValidity()) {
        message.textContent = "Veuillez entrer une adresse courriel valide.";
        return;
    }

    const bouton = formulaire.querySelector('button[type="submit"]');
    bouton.disabled = true;
    message.textContent = "Envoi en cours...";

    const { error } = await supabaseClient.auth.resetPasswordForEmail(
        email,
        {
            redirectTo:
                "https://dolores-nyanse.github.io/FuelChat-Projetfil-Rouge/nouveau-motdepasse.html"
        }
    );

    bouton.disabled = false;

    if (error) {
        console.error("Erreur de récupération :", error.message);
        message.textContent =
            "Impossible d'envoyer le courriel. Réessayez plus tard.";
        return;
    }

    message.textContent =
        "Si cette adresse possède un compte FuelChat, " +
        "un courriel de récupération sera envoyé.";
});
