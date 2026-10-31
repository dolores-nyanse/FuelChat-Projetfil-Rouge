const nomUtilisateur = document.getElementById("nomUtilisateur");
const emailUtilisateur = document.getElementById("emailUtilisateur");
const boutonDeconnexion = document.getElementById("boutonDeconnexion");
const themeSombre = document.getElementById("themeSombre");
const themeClair = document.getElementById("themeClair");

// ===== Thème (sombre / clair) =====
function appliquerTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
    themeSombre.classList.toggle("choisi", theme === "sombre");
    themeClair.classList.toggle("choisi", theme === "clair");
}

themeSombre.addEventListener("click", () => appliquerTheme("sombre"));
themeClair.addEventListener("click", () => appliquerTheme("clair"));

appliquerTheme(localStorage.getItem("theme") || "sombre");

// ===== Notifications =====
const notificationVisuelle = document.getElementById("notificationVisuelle");
const notificationSonore = document.getElementById("notificationSonore");

if (notificationVisuelle) {
    notificationVisuelle.checked =
        localStorage.getItem("notificationVisuelle") === "true";

    notificationVisuelle.addEventListener("change", () => {
        localStorage.setItem(
            "notificationVisuelle",
            notificationVisuelle.checked
        );
    });
}

if (notificationSonore) {
    notificationSonore.checked =
        localStorage.getItem("notificationSonore") === "true";

    notificationSonore.addEventListener("change", () => {
        localStorage.setItem(
            "notificationSonore",
            notificationSonore.checked
        );
    });
}

// ===== Profil =====
async function chargerProfil() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user) {
        window.location.href = "index.html";
        return;
    }

    const utilisateur = data.user;
    emailUtilisateur.textContent = utilisateur.email;

    // Nom d'utilisateur : table "profiles", sinon une valeur de secours
    let nom = (utilisateur.user_metadata &&
        utilisateur.user_metadata.username) ||
        utilisateur.email.split("@")[0];

    try {
        const { data: profil } = await supabaseClient
            .from("profiles")
            .select("username")
            .eq("id", utilisateur.id)
            .maybeSingle();

        if (profil && profil.username) {
            nom = profil.username;
        }
    } catch (erreur) {
        console.error("Profil :", erreur);
    }

    nomUtilisateur.textContent = nom;
}

chargerProfil();

// ===== Se déconnecter =====
boutonDeconnexion.addEventListener("click", async () => {
    boutonDeconnexion.disabled = true;

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        alert("Impossible de se déconnecter : " + error.message);
        boutonDeconnexion.disabled = false;
        return;
    }

    localStorage.removeItem("contactActifId");
    window.location.href = "index.html";
});