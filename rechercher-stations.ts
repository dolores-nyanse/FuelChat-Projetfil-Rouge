
import { withSupabase } from "jsr:@supabase/server@1";

export default {
  fetch: withSupabase({ auth: "user" }, async (req) => {

    if (req.method !== "POST") {
      return Response.json(
        { error: "Méthode non autorisée" },
        { status: 405 }
      );
    }

    let body;

    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "Données JSON invalides" },
        { status: 400 }
      );
    }

    const lat = Number(body?.latitude);
    const lng = Number(body?.longitude);
    const rayon = Number(body?.rayon ?? 10);
    const carburant = body?.carburant ?? "ordinaire";
    const classement = body?.classement ?? "value";

    if (
      !Number.isFinite(lat) || lat < 44 || lat > 63 ||
      !Number.isFinite(lng) || lng < -80 || lng > -57 ||
      !Number.isFinite(rayon) || rayon <= 0 || rayon > 30 ||
      !["ordinaire", "super", "diesel"].includes(carburant) ||
      !["value", "price", "distance"].includes(classement)
    ) {
      return Response.json(
        { error: "Paramètres de recherche invalides" },
        { status: 400 }
      );
    }

    const url = new URL(
      "https://www.gasquebec.ca/api/stations/nearby"
    );

    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lng", String(lng));
    url.searchParams.set("radius", String(rayon));
    url.searchParams.set("fuelType", carburant);
    url.searchParams.set("sort", classement);
    url.searchParams.set("limit", "10");

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json"
        },
        signal: AbortSignal.timeout(12000)
      });

      if (!response.ok) {
        console.error("Gas Quebec HTTP :", response.status);

        return Response.json(
          {
            error: "Service des stations temporairement indisponible",
            statutSource: response.status
          },
          { status: 502 }
        );
      }

      const data = await response.json();

      if (!Array.isArray(data.stations)) {
        return Response.json(
          { error: "Format des données inattendu" },
          { status: 502 }
        );
      }

      return Response.json({
        stations: data.stations,
        carburant: carburant,
        classement: classement,
        attribution: data.attribution ?? null
      });

    } catch (error) {
      console.error("Erreur Gas Quebec :", error);

      return Response.json(
        { error: "Impossible de contacter Gas Quebec" },
        { status: 502 }
      );
    }
  })
};
