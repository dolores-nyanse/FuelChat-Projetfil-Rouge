
/*
    FuelChat - Fonctionnalité Carburant

    Calcul du trajet, recherche et affichage
    des stations-service.

    Les données réelles proviendront des API
    lors de leur intégration.
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

// ===== DONNÉES =====

let distanceAutomatique = null;
let dureeAutomatique = null;
let prixAutomatique = null;
let positionRecherche = null;
let stationsDisponibles = [];

let dernierTrajet = null;

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
}

function afficherStatut(message) {
    statutStations.textContent = message;
}

// ===== CALCUL DU TRAJET =====

formulaireTrajet.addEventListener("submit", function (evenement) {

    evenement.preventDefault();

    const depart =
        document.getElementById("depart").value.trim();

    const destination =
        document.getElementById("destination").value.trim();

    const consommation = Number(
        document.getElementById("consommation").value
    );

    const typeCarburant =
        document.getElementById("typeCarburant").value;

    const distanceSaisie =
        document.getElementById("distanceManuelle").value.trim();

    if (depart === "" || destination === "") {
        afficherResultat(
            "Veuillez entrer le départ et la destination."
        );
        return;
    }

    if (!nombreValide(consommation) || consommation <= 0) {
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

    let distance = distanceAutomatique;
    let sourceDistance = "automatique";

    if (distance === null) {

        if (distanceSaisie === "") {
            afficherResultat(
                "Le calcul automatique n'est pas encore disponible.\n" +
                "Veuillez entrer une distance manuelle."
            );
            return;
        }

        distance = Number(distanceSaisie);
        sourceDistance = "manuelle";
    }

    if (!nombreValide(distance) || distance <= 0) {
        afficherResultat(
            "Veuillez entrer une distance valide."
        );
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
});

// ===== AFFICHAGE DU TRAJET =====

function actualiserResultatTrajet() {

    if (dernierTrajet === null) {
        return;
    }

    const trajet = dernierTrajet;

    let resultat =
        "Trajet : " + trajet.depart +
        " → " + trajet.destination + "\n" +
        "Distance : " + trajet.distance.toFixed(1) + " km\n" +
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

    if (
        nombreValide(prixAutomatique) &&
        prixAutomatique > 0
    ) {

        const cout = calculerCout(
            trajet.litres,
            prixAutomatique
        );

        resultat +=
            "\nPrix utilisé : " +
            prixAutomatique.toFixed(3) + " $/L" +
            "\nCoût estimé : " +
            cout.toFixed(2) + " $";

    } else {

        resultat +=
            "\nCoût estimé : indisponible " +
            "(prix du carburant non reçu).";
    }

    afficherResultat(resultat);
}

// ===== GÉOLOCALISATION =====

boutonPosition.addEventListener("click", function () {

    if (!navigator.geolocation) {
        afficherStatut(
            "La géolocalisation n'est pas disponible."
        );
        return;
    }

    boutonPosition.disabled = true;
    afficherStatut("Recherche de votre position...");

    navigator.geolocation.getCurrentPosition(

        function (position) {

            positionRecherche = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };

            boutonPosition.disabled = false;

            afficherStatut(
                "Position GPS obtenue. " +
                "La recherche des stations sera disponible " +
                "après la connexion à l'API."
            );
        },

        function (erreur) {

            boutonPosition.disabled = false;

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
});

// ===== CLASSEMENT DES STATIONS =====

function classerStations(stations, classement) {

    const copie = [...stations];

    if (classement === "price") {

        copie.sort(function (a, b) {

            const prixA = nombreValide(a.prix)
                ? a.prix : Infinity;

            const prixB = nombreValide(b.prix)
                ? b.prix : Infinity;

            return prixA - prixB;
        });

    } else if (classement === "distance") {

        copie.sort(function (a, b) {

            const distanceA = nombreValide(a.distance)
                ? a.distance : Infinity;

            const distanceB = nombreValide(b.distance)
                ? b.distance : Infinity;

            return distanceA - distanceB;
        });

    } else {

        // Le classement "value" sera calculé
        // par Gas Quebec lors de l'intégration.
        // On conserve l'ordre fourni par l'API.
    }

    return copie;
}

// ===== AFFICHAGE DES STATIONS =====

function afficherStations(stations, classement) {

    resultatsStations.replaceChildren();

    if (!Array.isArray(stations) || stations.length === 0) {

        afficherStatut(
            "Aucune station disponible pour cette recherche."
        );

        attributionStations.hidden = true;
        return;
    }

    const stationsClassees =
        classerStations(stations, classement);

    afficherStatut(
        stationsClassees.length + " station(s) trouvée(s)."
    );

    attributionStations.hidden = false;

    stationsClassees.forEach(function (station, index) {

        const carte = document.createElement("div");
        carte.className = "carte";

        const titre = document.createElement("h3");
        titre.textContent =
            station.nom || "Station-service";

        carte.appendChild(titre);

        // Indication de la recommandation
        // uniquement pour un classement fourni par l'API
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

boutonStations.addEventListener("click", function () {

    const carburant =
        document.getElementById("typeCarburant").value;

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

    if (!["value", "price", "distance"].includes(classement)) {
        afficherStatut(
            "Veuillez choisir un classement valide."
        );
        return;
    }

    if (stationsDisponibles.length === 0) {

        resultatsStations.replaceChildren();
        attributionStations.hidden = true;

        afficherStatut(
            "La recherche des stations n'est pas encore " +
            "connectée à Gas Quebec."
        );

        return;
    }

    afficherStations(stationsDisponibles, classement);
});

// ===== CONNEXION FUTURE AUX API =====

window.FuelChatCarburant = {

    definirTrajet: function (distance, duree) {

        if (nombreValide(distance) && distance > 0) {
            distanceAutomatique = distance;
        }

        if (nombreValide(duree) && duree >= 0) {
            dureeAutomatique = duree;
        }
    },

    definirPrix: function (prix) {

        if (nombreValide(prix) && prix > 0) {
            prixAutomatique = prix;
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
        }
    },

    obtenirRecherche: function () {

        return {
            position: positionRecherche,
            depart: document.getElementById("depart").value.trim(),
            carburant: document.getElementById("typeCarburant").value,
            rayon: Number(rayonRecherche.value),
            classement: classementStations.value
        };
    }
};
