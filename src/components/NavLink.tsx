import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// Estendemos as props originais, mas tratamos o className como string para facilitar
interface NavLinkCompatProps extends Omit<NavLinkProps, "className" | "style"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  style?: React.CSSProperties;
  activeStyle?: React.CSSProperties;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, style, activeStyle, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        // 🚀 Otimização: Extraímos as props customizadas e passamos apenas o que o Router entende
        className={({ isActive, isPending }) =>
          cn(
            className, 
            isActive && activeClassName, 
            isPending && pendingClassName
          )
        }
        style={({ isActive }) => ({
          ...style,
          ...(isActive ? activeStyle : {}),
        })}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };