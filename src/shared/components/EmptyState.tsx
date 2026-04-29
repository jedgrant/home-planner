import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";

interface EmptyStateProps {
  /** Illustration image src */
  image: string;
  /** Alt text for the illustration */
  imageAlt: string;
  /** Aspect ratio applied to the container while the image loads, e.g. "4/3" or "16/9" */
  aspectRatio?: string;
  /** Descriptive text shown above the action button */
  message: string;
  /** Label for the action button */
  buttonLabel: string;
  /** Route to navigate to when the button is tapped */
  buttonRoute: string;
}

export function EmptyState({
  image,
  imageAlt,
  aspectRatio = "4/3",
  message,
  buttonLabel,
  buttonRoute,
}: EmptyStateProps) {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);

  return (
    <div>
      <div
        className="relative overflow-hidden flex items-center justify-center"
        style={{ aspectRatio }}
      >
        {/* Placeholder shown until image loads */}
        {!loaded && <div className="absolute inset-0 bg-muted animate-pulse" />}

        {/* Low-opacity illustration fills the container */}
        <img
          src={image}
          alt={imageAlt}
          onLoad={() => setLoaded(true)}
          className={[
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            loaded ? "opacity-10" : "opacity-0",
          ].join(" ")}
        />
        <div className="absolute p-2 text-center rounded-xl bg-background/30 backdrop-blur-sm shadow-sm">
          <p className="text-sm mb-1">{message}</p>
          <Button onClick={() => navigate(buttonRoute)}>
            {buttonLabel}
          </Button>
        </div>
      </div>
      {/* Centred overlay: message + button */}
    </div>
  );
}
