import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  // サーバーサイドで環境変数からデフォルト値を取得
  const defaultValues = {
    jiraHost: process.env.JIRA_HOST || "",
    email: process.env.JIRA_EMAIL || "",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-jira-blue">Story Pointer</h1>
          <p className="mt-2 text-gray-600">
            AI を活用したストーリーポイント推定ツール
          </p>
        </div>
        <LoginForm defaultValues={defaultValues} />
      </div>
    </div>
  );
}
