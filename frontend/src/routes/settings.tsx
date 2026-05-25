import { Outlet, redirect } from "react-router";
import { Route } from "./+types/settings";
import OptionService from "#/api/option-service/option-service.api";
import { queryClient } from "#/query-client-config";
import { GetConfigResponse } from "#/api/option-service/option.types";
import { SettingsLayout } from "#/components/features/settings/settings-layout";

const SAAS_ONLY_PATHS = [
  "/settings/user",
  "/settings/billing",
  "/settings/credits",
  "/settings/api-keys",
];

export const clientLoader = async ({ request }: Route.ClientLoaderArgs) => {
  const url = new URL(request.url);
  const { pathname } = url;

  let config = queryClient.getQueryData<GetConfigResponse>(["config"]);
  if (!config) {
    config = await OptionService.getConfig();
    queryClient.setQueryData<GetConfigResponse>(["config"], config);
  }

  const isSaas = config?.APP_MODE === "saas";
  if (!isSaas && SAAS_ONLY_PATHS.includes(pathname)) {
    return redirect("/settings/profile");
  }

  return null;
};

export default function SettingsScreen() {
  return (
    <main data-testid="settings-screen" style={{ height: "100%", display: "flex" }}>
      <SettingsLayout>
        <Outlet />
      </SettingsLayout>
    </main>
  );
}
