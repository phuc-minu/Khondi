export type CostCategory = "flights" | "lodging" | "food" | "activities" | "local-transport";
export interface CostLine {
  category: CostCategory;
  label: string;
  covers: string;
  amountUsd: number;
}
export interface DayPlanEntry {
  day: 1 | 2 | 3 | 4 | 5;
  title: string;
  items: readonly string[];
}
export interface IllustrativeTrip {
  slug: "new-orleans-example";
  destination: "New Orleans, Louisiana";
  status: "illustrative";
  budgetUsd: number;
  travelers: { adults: number; children: number };
  origin: string;
  lengthDays: number;
  nights: number;
  timing: string;
  travelMode: "flying";
  costs: readonly CostLine[];
  notIncluded: readonly string[];
  days: readonly DayPlanEntry[];
}

export const newOrleansExample: IllustrativeTrip = {
  slug: "new-orleans-example",
  destination: "New Orleans, Louisiana",
  status: "illustrative",
  budgetUsd: 3000,
  travelers: { adults: 2, children: 0 },
  origin: "San Francisco Bay Area (SFO, OAK or SJC)",
  lengthDays: 4,
  nights: 3,
  timing: "An off-peak week in autumn; no specific dates",
  travelMode: "flying",
  costs: [
    {
      category: "flights",
      label: "Flights",
      covers: "Round-trip economy for 2, including taxes and one carry-on each",
      amountUsd: 900,
    },
    {
      category: "lodging",
      label: "Hotel",
      covers: "3 nights in one room, including taxes and fees",
      amountUsd: 1050,
    },
    {
      category: "food",
      label: "Food and drink",
      covers: "Meals and tips for 2 people over 4 days",
      amountUsd: 450,
    },
    {
      category: "activities",
      label: "Activities",
      covers: "Tours, music venues and museum entry",
      amountUsd: 350,
    },
    {
      category: "local-transport",
      label: "Getting around",
      covers: "Airport transfers, streetcar passes and occasional rideshares",
      amountUsd: 250,
    },
  ],
  notIncluded: [
    "Travel insurance",
    "Checked bag fees",
    "Shopping and souvenirs",
    "Travel to and from your home airport",
  ],
  days: [
    {
      day: 1,
      title: "Arrive and the French Quarter",
      items: [
        "Check in and walk the French Quarter",
        "Jackson Square and the riverfront",
        "Dinner and live music on Frenchmen Street",
      ],
    },
    {
      day: 2,
      title: "Garden District",
      items: [
        "Ride the St. Charles streetcar uptown",
        "Walk the Garden District's historic homes",
        "Lunch on Magazine Street",
      ],
    },
    {
      day: 3,
      title: "Museums and City Park",
      items: [
        "A morning at a museum of your choice",
        "Afternoon in City Park",
        "Evening food tour or cooking class",
      ],
    },
    {
      day: 4,
      title: "Last morning and departure",
      items: ["Breakfast and a short riverfront walk", "Head to the airport"],
    },
  ],
};
