import { getCountries } from "@/lib/services/country.service";
import { CountriesTable } from "./_components/countries-table";

export default async function PaisesPage() {
  const countries = await getCountries();

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <CountriesTable data={countries} />
    </div>
  );
}
