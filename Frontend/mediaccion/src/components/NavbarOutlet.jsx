import { Outlet } from "react-router-dom";
import StickyButton from '../components/StickyButton.jsx'

export default function LayoutConNavbar() {
  return (
    <>
      <Outlet />
      <StickyButton />
    </>
  );
}