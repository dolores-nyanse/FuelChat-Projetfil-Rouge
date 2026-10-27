// Connexion de FuelChat à Supabase

const supabaseUrl = "https://zmgbizurbgqfkxpeknkx.supabase.co";

const supabaseKey = "sb_publishable_tIPrnyzU-b_Pocl5x8mo0w_ZHdjEsX0";

const supabaseClient = window.supabase.createClient(
    supabaseUrl,
    supabaseKey
);

//Gestion de la page index 

console.log("Bienvenue sur FuelChat !");

// On definit les variables pour retrouver les boutons 
const boutonConnexion = document.getElementById("connexion");
const boutonInscription = document.getElementById("inscription");
console.log(boutonInscription);
console.log(boutonConnexion);

// On definit les variables pour retrouver les champs de texte pour l'email et le mot de passe
const champEmail = document.getElementById("email");
const champPassword = document.getElementById("password");

// On fait fonctioner l'inscription
boutonInscription.addEventListener("click", async function() {

    const email = champEmail.value.trim();
    const password = champPassword.value;

    if (email === "" || password === "") {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    if (!champEmail.checkValidity()) {
        alert("Veuillez saisir une adresse courriel valide.");
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password
    });

    if (error) {
        alert("Erreur : " + error.message);
    } else {
        alert("Inscription effectuée ! Vérifiez votre courriel si une confirmation est demandée.");
    }
});
// on fait fonctioner la connexion
boutonConnexion.addEventListener("click", async function() {

    const email = champEmail.value.trim();
    const password = champPassword.value;

    if (email === "" || password === "") {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    if (!champEmail.checkValidity()) {
        alert("Veuillez saisir une adresse courriel valide.");
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        alert("Connexion impossible. Vérifiez vos identifiants.");
    } else {
        alert("Connexion réussie !");
        window.location.href = "conversation.html"; // pour passer à la page conversation 
    }
});

