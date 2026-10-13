import { getCashHistory, getCashStatus } from "../actions";
import { CashClient } from "./CashClient";

export const dynamic = "force-dynamic";

export default async function CashPage() {
  const [status, history] = await Promise.all([getCashStatus(), getCashHistory()]);

  return <CashClient initialStatus={status} history={history} />;
}
