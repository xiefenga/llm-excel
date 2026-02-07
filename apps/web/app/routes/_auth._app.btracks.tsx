import BTrackPage from "~/features/btrack/btrack-page";

import type { Route } from "./+types/_auth._app.btracks";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "异常追踪 - Selgetabel" },
    { name: "description", content: "查看异常轨迹与修复状态" },
  ];
}

const BTrackRoute = () => {
  return <BTrackPage />;
};

export default BTrackRoute;
