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

// On definit les variables pour retrouver les champs de texte pour l'email, le mot de passe  et username
const champEmail = document.getElementById("email");
const champPassword = document.getElementById("password");
const champUsername = document.getElementById("username");

// On fait fonctioner l'inscription
boutonInscription.addEventListener("click", async function() {

    const email = champEmail.value.trim();
    const password = champPassword.value;
    const username = champUsername.value.trim();

    // Vérifier le nom d'utilisateur
    if (!/^[a-zA-Z0-9_]{3,40}$/.test(username)) {
        alert("Nom invalide : 3 à 40 caractères, lettres, chiffres ou _.");
        return;
    }

    // Vérifier le courriel
    if (!champEmail.checkValidity()) {
        alert("Veuillez saisir une adresse courriel valide.");
        return;
    }

    // Vérifier le mot de passe
    if (password.length < 6) {
        alert("Le mot de passe doit contenir au moins 6 caractères.");
        return;
    }

    // Inscription avec Supabase
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                username: username
            },
            emailRedirectTo:
                "https://dolores-nyanse.github.io/FuelChat-Projetfil-Rouge/"
        }
    });

    if (error) {
        console.error("Erreur d'inscription :", error.message);
        alert("Inscription impossible : " + error.message);
    } else {
        alert("Demande d'inscription reçue ! Vérifiez votre courriel.");
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

