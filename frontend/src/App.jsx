import AppRoutes from "./AppRoutes";
import Header from "./components/Header/Header";
import { UserProvider } from "./context/UserContext";

function App() {
  return (
    <UserProvider>
      <Header />
      <AppRoutes />
    </UserProvider>
  );
}

export default App;
