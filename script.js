console.log("Bienvenue sur FuelChat !");
// On definit les variables pour retrouver les boutons 
const boutonConnexion = document.getElementById("connexion");
const boutonInscription = document.getElementById("inscription");
console.log(boutonInscription);
console.log(boutonConnexion);

// On definit les variables pour retrouver les champs de texte pour l'email et le mot de passe
const champEmail = document.getElementById("email");
const champPassword = document.getElementById("password");

// On fait fonctioner les clicks
boutonInscription.addEventListener("click", function() {
    
});

boutonConnexion.addEventListener("click", function() {
     if (champEmail.value.trim() === "" || champPassword.value === "") { //.trim pour verifier l'espace
        alert("Veuillez remplir tous les champs.");
    } else {
        alert("Les champs sont remplis !");
    }
});


