
import { withSupabase } from "jsr:@supabase/server@1";

const ORS_KEY = Deno.env.get("ORS_API_KEY");

async function trouverCoordonnees(lieu: string) {
  const url = new URL("https://api.heigit.org/pelias/v1/search");

  url.searchParams.set("text", lieu);
  url.searchParams.set("size", "1");

  const response = await fetch(url, {
    headers: {
      Authorization: ORS_KEY!,
    },
  });

  if (!response.ok) {
    throw new Error(`Géocodage indisponible (${response.status})`);
  }

  const data = await response.json();
  const coordonnees = data.features?.[0]?.geometry?.coordinates;

  if (!Array.isArray(coordonnees) || coordonnees.length < 2) {
    throw new Error(`Lieu introuvable : ${lieu}`);
  }

  return coordonnees as [number, number];
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req) => {
    if (req.method !== "POST") {
      return Response.json(
        { error: "Méthode non autorisée" },
        { status: 405 },
      );
    }

    if (!ORS_KEY) {
      return Response.json(
        { error: "Configuration API manquante" },
        { status: 500 },
      );
    }

    let depart: unknown;
    let destination: unknown;

    try {
      const body = await req.json();
      depart = body?.depart;
      destination = body?.destination;
    } catch {
      return Response.json(
        { error: "Données JSON invalides" },
        { status: 400 },
      );
    }

    if (
      typeof depart !== "string" ||
      typeof destination !== "string" ||
      !depart.trim() ||
      !destination.trim() ||
      depart.length > 150 ||
      destination.length > 150
    ) {
      return Response.json(
        { error: "Départ ou destination invalide" },
        { status: 400 },
      );
    }

    try {
      const [coordDepart, coordDestination] = await Promise.all([
        trouverCoordonnees(depart.trim()),
        trouverCoordonnees(destination.trim()),
      ]);
      
       console.log("Départ demandé :", depart);
       console.log("Coordonnées départ :", coordDepart);

       console.log("Destination demandée :", destination);
       console.log("Coordonnées destination :", coordDestination);


      const response = await fetch(
        "https://api.heigit.org/openrouteservice/v2/directions/driving-car/json",
        {
          method: "POST",
          headers: {
            Authorization: ORS_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            coordinates: [coordDepart, coordDestination],
            radiuses: [2000, 2000]
          }),
        },
      );

      
       if (!response.ok) {
         const details = await response.text();
         console.error("Réponse OpenRouteService :", response.status, details);
        throw new Error(`Itinéraire indisponible (${response.status})`);
        }


      const data = await response.json();
      const summary = data.routes?.[0]?.summary;

      if (
        !summary ||
        !Number.isFinite(summary.distance) ||
        !Number.isFinite(summary.duration)
      ) {
        throw new Error("Aucun itinéraire trouvé");
      }

      return Response.json({
        depart: depart.trim(),
        destination: destination.trim(),
        distanceKm: Number((summary.distance / 1000).toFixed(2)),
        dureeMinutes: Math.round(summary.duration / 60),
        coordonneesDepart: {
          longitude: coordDepart[0],
          latitude: coordDepart[1],
        },
      });
    } catch (error) {
      console.error("Erreur calculer-trajet :", error);

      return Response.json(
        {
          error: "Impossible de calculer cet itinéraire pour le moment.",
        },
        { status: 502 },
      );
    }
  }),
};
