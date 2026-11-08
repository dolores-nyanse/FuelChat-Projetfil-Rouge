
/*
    FuelChat - Fonctionnalité Carburant
    Calcul du trajet et recherche des stations-service
    Connexion aux fonctions Supabase
*/

// ===== ÉLÉMENTS HTML =====

const formulaireTrajet =
    document.getElementById("formulaireTrajet");

const resultatTrajet =
    document.getElementById("resultatTrajet");

const boutonPosition =
    document.getElementById("boutonPosition");

const boutonStations =
    document.getElementById("boutonStations");

const rayonRecherche =
    document.getElementById("rayonRecherche");

const classementStations =
    document.getElementById("classementStations");

const statutStations =
    document.getElementById("statutStations");

const resultatsStations =
    document.getElementById("resultatsStations");

const attributionStations =
    document.getElementById("attributionStations");

const boutonCalculer =
    document.getElementById("boutonCalculer");

const champPrixManuel =
    document.getElementById("prixManuel");

const champTypeCarburant =
    document.getElementById("typeCarburant");

// ===== DONNÉES =====

let distanceAutomatique = null;
let dureeAutomatique = null;
let prixAutomatique = null;

let positionRecherche = null;
let coordonneesDepart = null;

let stationsDisponibles = [];
let dernierTrajet = null;

let carburantPrixAutomatique = null;

let calculEnCours = false;
let rechercheEnCours = false;

// ===== FONCTIONS UTILES =====

function nombreValide(valeur) {
    return typeof valeur === "number" &&
        Number.isFinite(valeur);
}

function calculerLitres(distance, consommation) {
    return distance * consommation / 100;
}

function calculerCout(litres, prix) {
    return litres * prix;
}

function afficherResultat(message) {
    resultatTrajet.hidden = false;
    resultatTrajet.textContent = message;
    resultatTrajet.style.whiteSpace = "pre-line";
}

function afficherStatut(message) {
    statutStations.textContent = message;
}

function obtenirClientSupabase() {
    if (
        typeof supabaseClient === "undefined" ||
        !supabaseClient ||
        !supabaseClient.functions
    ) {
        throw new Error(
            "La connexion Supabase n'est pas disponible."
        );
    }

    return supabaseClient;
}

function obtenirCoordonnees(valeur) {
    if (!valeur || typeof valeur !== "object") {
        return null;
    }

    const latitude = Number(valeur.latitude);
    const longitude = Number(valeur.longitude);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        return null;
    }

    return {
        latitude: latitude,
        longitude: longitude
    };
}

// ===== GESTION DES PRIX =====

function obtenirPrixManuel() {
    const saisie = champPrixManuel.value.trim();

    if (saisie === "") {
        return null;
    }

    const prix = Number(saisie);

    if (
        !nombreValide(prix) ||
        prix <= 0
    ) {
        return null;
    }

    return prix;
}

function obtenirPrixApplicable() {
    if (
        nombreValide(prixAutomatique) &&
        prixAutomatique > 0 &&
        dernierTrajet !== null &&
        carburantPrixAutomatique === dernierTrajet.carburant
    ) {
        return {
            prix: prixAutomatique,
            source: "automatique"
        };
    }

    const prixManuel = obtenirPrixManuel();

    if (prixManuel !== null) {
        return {
            prix: prixManuel,
            source: "manuelle"
        };
    }

    return {
        prix: null,
        source: null
    };
}

function reinitialiserPrixAutomatique() {
    prixAutomatique = null;
    carburantPrixAutomatique = null;
}

// Actualiser le coût quand le prix manuel change.
champPrixManuel.addEventListener(
    "input",
    function () {
        actualiserResultatTrajet();
    }
);

// Un prix d'un carburant ne doit pas être
// réutilisé pour un autre type de carburant.
champTypeCarburant.addEventListener(
    "change",
    function () {
        reinitialiserPrixAutomatique();
        stationsDisponibles = [];

        resultatsStations.replaceChildren();
        attributionStations.hidden = true;

        afficherStatut(
            "Choisissez votre recherche de stations."
        );

        if (dernierTrajet !== null) {
            dernierTrajet.carburant = champTypeCarburant.value;
            actualiserResultatTrajet();
        }
    }
);

// ===== CALCUL AUTOMATIQUE DU TRAJET =====

async function calculerTrajetAPI(depart, destination) {
    const client = obtenirClientSupabase();

    const { data, error } = await client.functions.invoke(
        "calculer-trajet",
        {
            body: {
                depart: depart,
                destination: destination
            }
        }
    );

    if (error) {
        throw new Error(
            "Le service de calcul automatique est indisponible."
        );
    }

    if (!data || typeof data !== "object") {
        throw new Error(
            "La réponse du service de trajet est invalide."
        );
    }

    const distance = data.distanceKm;
    const duree = data.dureeMinutes;

    if (
        !nombreValide(distance) ||
        distance <= 0
    ) {
        throw new Error(
            "Le service n'a pas renvoyé une distance valide."
        );
    }

    if (
        !nombreValide(duree) ||
        duree < 0
    ) {
        throw new Error(
            "Le service n'a pas renvoyé une durée valide."
        );
    }

    return {
        distanceKm: distance,
        dureeMinutes: duree,
        coordonneesDepart:
            obtenirCoordonnees(data.coordonneesDepart)
    };
}

// ===== FORMULAIRE DE TRAJET =====

formulaireTrajet.addEventListener(
    "submit",
    async function (evenement) {

        evenement.preventDefault();

        if (calculEnCours) {
            return;
        }

        const depart =
            document.getElementById("depart").value.trim();

        const destination =
            document.getElementById("destination").value.trim();

        const consommation = Number(
            document.getElementById("consommation").value
        );

        const typeCarburant =
            champTypeCarburant.value;

        const distanceSaisie =
            document.getElementById("distanceManuelle").value.trim();

        if (depart === "" || destination === "") {
            afficherResultat(
                "Veuillez entrer le départ et la destination."
            );
            return;
        }

        if (
            !nombreValide(consommation) ||
            consommation <= 0
        ) {
            afficherResultat(
                "Veuillez entrer une consommation valide."
            );
            return;
        }

        if (typeCarburant === "") {
            afficherResultat(
                "Veuillez choisir un type de carburant."
            );
            return;
        }

        calculEnCours = true;
        boutonCalculer.disabled = true;

        afficherResultat(
            "Calcul du trajet en cours..."
        );

        distanceAutomatique = null;
        dureeAutomatique = null;
        coordonneesDepart = null;
        dernierTrajet = null;

        // Ne pas conserver le prix d'un ancien trajet.
        reinitialiserPrixAutomatique();

        let distance = null;
        let sourceDistance = "automatique";
        let erreurAutomatique = "";

        try {
            const trajet = await calculerTrajetAPI(
                depart,
                destination
            );

            distanceAutomatique = trajet.distanceKm;
            dureeAutomatique = trajet.dureeMinutes;
            coordonneesDepart = trajet.coordonneesDepart;

            distance = distanceAutomatique;

        } catch (erreur) {
            console.error(
                "Calcul automatique du trajet :",
                erreur
            );

            erreurAutomatique = erreur.message;

            if (distanceSaisie !== "") {
                distance = Number(distanceSaisie);
                sourceDistance = "manuelle";
            }
        }

        if (
            !nombreValide(distance) ||
            distance <= 0
        ) {
            afficherResultat(
                "Impossible de calculer automatiquement le trajet.\n" +
                erreurAutomatique + "\n" +
                "Veuillez saisir une distance manuelle " +
                "pour continuer."
            );

            calculEnCours = false;
            boutonCalculer.disabled = false;
            return;
        }

        const litres = calculerLitres(
            distance,
            consommation
        );

        dernierTrajet = {
            depart: depart,
            destination: destination,
            distance: distance,
            consommation: consommation,
            carburant: typeCarburant,
            litres: litres,
            sourceDistance: sourceDistance
        };

        actualiserResultatTrajet();

        calculEnCours = false;
        boutonCalculer.disabled = false;
    }
);

// ===== AFFICHAGE DU TRAJET =====

function actualiserResultatTrajet() {

    if (dernierTrajet === null) {
        return;
    }

    const trajet = dernierTrajet;

    let resultat =
        "Trajet : " + trajet.depart +
        " → " + trajet.destination + "\n" +
        "Distance : " +
        trajet.distance.toFixed(1) + " km\n" +
        "Source de la distance : " +
        trajet.sourceDistance + "\n" +
        "Carburant : " + trajet.carburant + "\n" +
        "Consommation : " +
        trajet.consommation.toFixed(1) + " L/100 km\n" +
        "Quantité nécessaire : " +
        trajet.litres.toFixed(2) + " L";

    if (
        trajet.sourceDistance === "automatique" &&
        nombreValide(dureeAutomatique)
    ) {
        resultat +=
            "\nDurée estimée : " +
            dureeAutomatique.toFixed(0) + " min";
    }

    const prixApplicable = obtenirPrixApplicable();

    if (prixApplicable.prix !== null) {

        const cout = calculerCout(
            trajet.litres,
            prixApplicable.prix
        );

        resultat +=
            "\nPrix utilisé : " +
            prixApplicable.prix.toFixed(3) + " $/L" +
            "\nSource du prix : " +
            prixApplicable.source +
            "\nCoût estimé : " +
            cout.toFixed(2) + " $";

    } else {
        resultat +=
            "\nCoût estimé : indisponible " +
            "(aucun prix du carburant disponible).";
    }

    afficherResultat(resultat);
}

// ===== GÉOLOCALISATION =====

boutonPosition.addEventListener(
    "click",
    function () {

        if (!navigator.geolocation) {
            afficherStatut(
                "La géolocalisation n'est pas disponible."
            );
            return;
        }

        boutonPosition.disabled = true;

        afficherStatut(
            "Recherche de votre position..."
        );

        navigator.geolocation.getCurrentPosition(

            function (position) {

                positionRecherche = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };

                boutonPosition.disabled = false;

                afficherStatut(
                    "Position GPS obtenue. " +
                    "Vous pouvez maintenant rechercher les stations."
                );
            },

            function (erreur) {

                boutonPosition.disabled = false;
                positionRecherche = null;

                if (erreur.code === 1) {
                    afficherStatut(
                        "L'accès à la position a été refusé."
                    );
                } else {
                    afficherStatut(
                        "Impossible d'obtenir votre position."
                    );
                }
            },

            {
                enableHighAccuracy: false,
                timeout: 10000
            }
        );
    }
);

// ===== CLASSEMENT DES STATIONS =====

function classerStations(stations, classement) {

    const copie = [...stations];

    if (classement === "price") {

        copie.sort(function (a, b) {

            const prixA = nombreValide(a.prix)
                ? a.prix
                : Infinity;

            const prixB = nombreValide(b.prix)
                ? b.prix
                : Infinity;

            return prixA - prixB;
        });

    } else if (classement === "distance") {

        copie.sort(function (a, b) {

            const distanceA = nombreValide(a.distance)
                ? a.distance
                : Infinity;

            const distanceB = nombreValide(b.distance)
                ? b.distance
                : Infinity;

            return distanceA - distanceB;
        });
    }

    return copie;
}

// ===== AFFICHAGE DES STATIONS =====

function afficherStations(stations, classement) {

    resultatsStations.replaceChildren();

    if (
        !Array.isArray(stations) ||
        stations.length === 0
    ) {
        afficherStatut(
            "Aucune station disponible pour cette recherche."
        );

        attributionStations.hidden = true;
        return;
    }

    const stationsClassees =
        classerStations(stations, classement);

    afficherStatut(
        stationsClassees.length +
        " station(s) trouvée(s)."
    );

    attributionStations.hidden = false;

    stationsClassees.forEach(function (station, index) {

        const carte = document.createElement("div");
        carte.className = "carte";

        const titre = document.createElement("h3");

        titre.textContent =
            station.nom || "Station-service";

        carte.appendChild(titre);

        if (
            classement === "value" &&
            index === 0 &&
            station.recommandee === true
        ) {
            const recommandation =
                document.createElement("p");

            recommandation.textContent =
                "Meilleur compromis prix/proximité";

            recommandation.style.fontWeight = "bold";
            recommandation.style.color = "#1aa0ff";

            carte.appendChild(recommandation);
        }

        const adresse = document.createElement("p");

        adresse.textContent =
            "Adresse : " +
            (station.adresse || "Non disponible");

        const distance = document.createElement("p");

        distance.textContent =
            "Distance : " +
            (
                nombreValide(station.distance)
                    ? station.distance.toFixed(1) + " km"
                    : "Non disponible"
            );

        const prix = document.createElement("p");

        prix.textContent =
            "Prix : " +
            (
                nombreValide(station.prix)
                    ? station.prix.toFixed(3) + " $/L"
                    : "Non disponible"
            );

        const date = document.createElement("p");

        date.textContent =
            "Mise à jour : " +
            (station.dateMiseAJour || "Non disponible");

        carte.appendChild(adresse);
        carte.appendChild(distance);
        carte.appendChild(prix);
        carte.appendChild(date);

        if (station.perime === true) {

            const avertissement =
                document.createElement("p");

            avertissement.textContent =
                "Prix potentiellement périmé.";

            carte.appendChild(avertissement);
        }

        resultatsStations.appendChild(carte);
    });
}

// ===== RECHERCHE DES STATIONS =====

boutonStations.addEventListener(
    "click",
    async function () {

        if (rechercheEnCours) {
            return;
        }

        const carburant =
            champTypeCarburant.value;

        const rayon = Number(rayonRecherche.value);

        const classement = classementStations.value;

        if (carburant === "") {
            afficherStatut(
                "Veuillez choisir un type de carburant."
            );
            return;
        }

        if (![5, 10, 20].includes(rayon)) {
            afficherStatut(
                "Veuillez choisir un rayon valide."
            );
            return;
        }

        if (
            !["value", "price", "distance"].includes(classement)
        ) {
            afficherStatut(
                "Veuillez choisir un classement valide."
            );
            return;
        }

        const position =
            positionRecherche || coordonneesDepart;

        if (!position) {
            afficherStatut(
                "Veuillez utiliser votre position GPS " +
                "ou calculer automatiquement un trajet " +
                "avant de rechercher les stations."
            );
            return;
        }

        rechercheEnCours = true;
        boutonStations.disabled = true;

        resultatsStations.replaceChildren();
        attributionStations.hidden = true;

        // Une nouvelle recherche ne doit pas
        // conserver le prix de l'ancienne.
        reinitialiserPrixAutomatique();
        stationsDisponibles = [];

        actualiserResultatTrajet();

        afficherStatut(
            "Recherche des stations-service en cours..."
        );

        try {
            const client = obtenirClientSupabase();

            if (typeof window.chargerStations !== "function") {
                throw new Error(
                    "Le fichier stations.js n'est pas chargé."
                );
            }

            const parametres = {
                latitude: position.latitude,
                longitude: position.longitude,
                rayon: rayon,
                carburant: carburant,
                classement: classement
            };

            const stations = await window.chargerStations(
                client,
                parametres
            );

            if (!Array.isArray(stations)) {
                throw new Error(
                    "La liste des stations est invalide."
                );
            }

        } catch (erreur) {

            console.error(
                "Recherche des stations :",
                erreur
            );

            resultatsStations.replaceChildren();
            attributionStations.hidden = true;

            afficherStatut(
                "Impossible de récupérer les stations-service. " +
                erreur.message
            );

        } finally {
            rechercheEnCours = false;
            boutonStations.disabled = false;
        }
    }
);

// ===== CHOISIR UN PRIX DISPONIBLE =====

function trouverPrixDisponible(stations) {

    if (!Array.isArray(stations)) {
        return null;
    }

    const prixValides = stations
        .map(function (station) {
            return station.prix;
        })
        .filter(function (prix) {
            return nombreValide(prix) && prix > 0;
        });

    if (prixValides.length === 0) {
        return null;
    }

    return Math.min(...prixValides);
}

// ===== CONNEXION AVEC STATIONS.JS =====

window.FuelChatCarburant = {

    definirTrajet: function (distance, duree) {

        if (
            nombreValide(distance) &&
            distance > 0
        ) {
            distanceAutomatique = distance;
        }

        if (
            nombreValide(duree) &&
            duree >= 0
        ) {
            dureeAutomatique = duree;
        }
    },

    definirPrix: function (prix) {

        if (
            nombreValide(prix) &&
            prix > 0
        ) {
            prixAutomatique = prix;
            carburantPrixAutomatique =
                champTypeCarburant.value;

            actualiserResultatTrajet();
        }
    },

    definirStations: function (stations) {

        if (Array.isArray(stations)) {

            stationsDisponibles = stations;

            afficherStations(
                stationsDisponibles,
                classementStations.value
            );

            const prix = trouverPrixDisponible(
                stationsDisponibles
            );

            if (prix !== null) {
                this.definirPrix(prix);
            } else {
                reinitialiserPrixAutomatique();
                actualiserResultatTrajet();
            }
        }
    },

    obtenirRecherche: function () {

        return {
            position: positionRecherche,
            depart:
                document.getElementById("depart").value.trim(),
            carburant:
                champTypeCarburant.value,
            rayon: Number(rayonRecherche.value),
            classement: classementStations.value
        };
    }
};
