import { LoginTest } from '@/components/auth/LoginTest';
import { Layout } from '@/components/layout/Layout';

export default function TestLogin() {
  return (
    <Layout>
      <div className="container mx-auto py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Authentication Test</h1>
            <p className="text-muted-foreground">
              Test and verify the authentication system functionality
            </p>
          </div>
          <LoginTest />
        </div>
      </div>
    </Layout>
  );
}
