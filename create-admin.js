// Quick admin creation script
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://klifzjcfnlaxminytmyh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsaWZ6amNmbmxheG1pbnl0bXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODg5NzcsImV4cCI6MjA3MTI2NDk3N30.kY9eVUh2hKZvOgixYTwggsznN4gD1ktNX4phXQ5TTdU";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_CREDENTIALS = {
  email: 'admin@biolegendscientific.co.ke',
  password: 'Biolegend2024!Admin',
  fullName: 'System Administrator'
};

async function createAdmin() {
  console.log('Creating admin user...');
  
  try {
    // Try to sign up the admin user
    const { data, error } = await supabase.auth.signUp({
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
      options: {
        data: {
          full_name: ADMIN_CREDENTIALS.fullName,
        },
      },
    });

    if (error) {
      console.error('Error creating admin:', error.message);
      return;
    }

    console.log('Admin user created successfully!');
    console.log('Email:', ADMIN_CREDENTIALS.email);
    console.log('Password:', ADMIN_CREDENTIALS.password);
    
    if (data.user) {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: ADMIN_CREDENTIALS.email,
          full_name: ADMIN_CREDENTIALS.fullName,
        });

      if (profileError) {
        console.error('Profile update error:', profileError);
      } else {
        console.log('Profile created successfully');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

createAdmin();
