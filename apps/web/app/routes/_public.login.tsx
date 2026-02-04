import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, LogIn, CheckCircle2 } from "lucide-react";
import { useNavigate, Link, useLocation } from "react-router";

import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

import { login } from "~/api/auth";
import { useAuthStore } from "~/stores/auth";

import type { FormEvent } from "react";
import type { Route } from "./+types/_public.login";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "登录 - Selgetabel" },
    { name: "description", content: "登录到 Selgetabel 系统" },
  ];
}

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 检查是否有注册成功的消息
  useEffect(() => {
    const state = location.state as { message?: string } | null;
    if (state?.message) {
      setSuccessMessage(state.message);
      // 清除 location state，避免刷新后仍显示
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const userInfo = await login({ account, password });
      // 更新 store 中的用户信息
      setUser(userInfo);
      // 使 react-query 缓存失效，触发重新获取
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      // 登录成功，跳转到首页
      navigate("/");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "登录失败，请重试";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header - outside card for cleaner look */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">欢迎回来</h1>
        <p className="text-gray-500">登录您的账户以继续使用</p>
      </div>

      <Card className="shadow-xl border border-gray-100 bg-white/80 backdrop-blur-sm">
        <CardHeader className="sr-only">
          <CardTitle>登录</CardTitle>
          <CardDescription>登录表单</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Success Message */}
            {successMessage && (
              <div className="bg-success/10 border border-success/30 text-success px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-xl text-sm animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            {/* Account Input */}
            <div className="space-y-2">
              <label htmlFor="account" className="text-sm font-medium text-gray-700">
                账户
              </label>
              <Input
                id="account"
                type="text"
                placeholder="邮箱或用户名"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                disabled={isLoading}
                required
                className="h-12 bg-gray-50/50 border-gray-200 focus:border-brand focus:ring-brand/20 focus:bg-white transition-colors rounded-xl"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  密码
                </label>
                <button
                  type="button"
                  className="text-xs text-brand hover:text-brand-dark transition-colors"
                >
                  忘记密码？
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                className="h-12 bg-gray-50/50 border-gray-200 focus:border-brand focus:ring-brand/20 focus:bg-white transition-colors rounded-xl"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || !account || !password}
              className="w-full h-12 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-base shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 rounded-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  登录中...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  登录
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-gray-400">或</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              还没有账户？{" "}
              <Link
                to="/register"
                className="text-brand hover:text-brand-dark font-semibold underline-offset-4 hover:underline transition-colors"
              >
                立即注册
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          安全登录
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          数据加密
        </span>
      </div>
    </div>
  );
};

export default LoginPage;
