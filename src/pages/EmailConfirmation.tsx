import { EmailConfirmationBypass } from '@/components/EmailConfirmationBypass';

export default function EmailConfirmation() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Email Confirmation Issue</h1>
          <p className="text-muted-foreground">
            Resolve email confirmation requirements for super admin creation
          </p>
        </div>
      </div>

      {/* Email Confirmation Bypass Component */}
      <EmailConfirmationBypass />
    </div>
  );
}
