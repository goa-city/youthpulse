import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function DBTest() {
  const { data, error } = await supabase
    .from("surveys")
    .select("*")
    .limit(1);

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>Database Connected ✅</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}