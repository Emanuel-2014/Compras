import "../globals.css"; // Import global styles if needed for login page
export const metadata = {
  title: "Login",
  description: "Login page for Pollos al día app",
};
export default function AuthLayout({ children }) {
  return (
    <>
      {children}
    </>
  );
}
