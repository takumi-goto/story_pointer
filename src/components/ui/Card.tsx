"use client";

import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", padding = "md", children, ...props }, ref) => {
    const paddingStyles = {
      none: "",
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    };

    return (
      <div
        ref={ref}
        className={`bg-white rounded-lg border border-gray-200 shadow-sm ${paddingStyles[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export const CardHeader = ({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`border-b border-gray-200 pb-4 mb-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className = "", children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ className = "", children, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-sm text-gray-500 mt-1 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent = ({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={className} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`border-t border-gray-200 pt-4 mt-4 ${className}`} {...props}>
    {children}
  </div>
);

export default Card;
