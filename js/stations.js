
/*
  FuelChat — Recherche des stations-service
  Connexion à Supabase et Gas Quebec
*/

// Fonction permettant de récupérer les stations
async function rechercherStationsAPI(clientSupabase, parametres) {

    const { data, error } = await clientSupabase.functions.invoke(
        "rechercher-stations",
        {
            body: {
                latitude: parametres.latitude,
                longitude: parametres.longitude,
                rayon: parametres.rayon,
                carburant: parametres.carburant,
                classement: parametres.classement
            }
        }
    );

    if (error) {
        throw new Error(
            "Impossible de récupérer les stations-service."
        );
    }

    if (!data || !Array.isArray(data.stations)) {
        throw new Error(
            "Les données des stations sont invalides."
        );
    }

    return data.stations;
}

// Rendre la fonction accessible à carburant.js
window.rechercherStationsAPI = rechercherStationsAPI;


/*
  Transformer les données Gas Quebec
  pour l'interface FuelChat.
*/

function normaliserStations(stations, carburant, classement) {

    const champsPrix = {
        ordinaire: "prixOrdinaire",
        super: "prixSuper",
        diesel: "prixDiesel"
    };

    const champPrix = champsPrix[carburant];

    if (!champPrix || !Array.isArray(stations)) {
        return [];
    }

    return stations.map(function (station, index) {

        const prixCentimes = station[champPrix];

        const prixValide =
            typeof prixCentimes === "number" &&
            Number.isFinite(prixCentimes) &&
            prixCentimes > 0;

        return {
            nom: station.name || "Station-service",
            adresse: station.address || "Adresse non disponible",

            distance:
                typeof station.distanceKm === "number" &&
                Number.isFinite(station.distanceKm)
                    ? station.distanceKm
                    : null,

            // Conversion des cents en dollars par litre
            prix: prixValide ? prixCentimes / 100 : null,

            // Ces données ne sont pas fournies
            // par l'endpoint nearby.
            dateMiseAJour: null,
            perime: null,

            recommandee:
                classement === "value" &&
                index === 0 &&
                prixValide
        };
    });
}

window.normaliserStations = normaliserStations;


/*
  Recherche complète des stations :
  appel Supabase + normalisation des données.
*/

async function chargerStations(clientSupabase, parametres) {

    // 1. Récupérer les données réelles depuis Supabase
    const stations = await rechercherStationsAPI(
        clientSupabase,
        parametres
    );

    // 2. Transformer les données pour FuelChat
    const stationsNormalisees = normaliserStations(
        stations,
        parametres.carburant,
        parametres.classement
    );

    // 3. Transmettre les stations à l'interface existante
    if (
        window.FuelChatCarburant &&
        typeof window.FuelChatCarburant.definirStations === "function"
    ) {
        window.FuelChatCarburant.definirStations(
            stationsNormalisees
        );
    }

    return stationsNormalisees;
}

window.chargerStations = chargerStations;