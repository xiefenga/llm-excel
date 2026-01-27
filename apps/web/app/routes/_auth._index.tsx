import { useEffect } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/_auth._index";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "LLM Excel" },
    { name: "description", content: "使用 LLM 处理 Excel 数据" },
  ];
}

// 重定向到 /threads
export default function IndexPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/threads", { replace: true });
  }, [navigate]);

  return null;
}
