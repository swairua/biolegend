import { AdminRoleDiagnostic } from '@/components/AdminRoleDiagnostic';

export default function AdminDiagnostic() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Role Diagnostic</h1>
        <p className="text-muted-foreground">
          Check and manage your administrator privileges
        </p>
      </div>
      
      <AdminRoleDiagnostic />
    </div>
  );
}
