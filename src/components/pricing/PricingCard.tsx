import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface PricingFeature {
    text: string;
    included: boolean;
}

interface PricingCardProps {
    title: string;
    description: string;
    price: string;
    period: string;
    features: PricingFeature[];
    buttonText: string;
    popular?: boolean;
    onButtonClick?: () => void;
    highlighted?: boolean;
    buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link";
}

export function PricingCard({
    title,
    description,
    price,
    period,
    features,
    buttonText,
    popular = false,
    highlighted = false,
    buttonVariant = "default",
}: PricingCardProps) {
    return (
        <Card className={cn(
            "flex flex-col relative transition-all duration-200 hover:shadow-lg h-full",
            highlighted ? "border-primary shadow-md z-10" : "border-border"
        )}>
            {popular && (
                <Badge
                    className="absolute -top-[1px] -right-[1px] rounded-tl-none rounded-br-none rounded-tr-[7px] rounded-bl-md bg-primary text-primary-foreground border-none px-3 py-1"
                >
                    Most Popular
                </Badge>
            )}

            <CardHeader className="pb-8 pt-6">
                <CardTitle className="text-2xl font-bold">{title}</CardTitle>
                <CardDescription className="text-muted-foreground mt-2 min-h-[40px]">
                    {description}
                </CardDescription>
                <div className="mt-4 flex items-baseline text-wrap">
                    <span className="text-4xl font-extrabold tracking-tight">{price}</span>
                    {price !== "Free" && <span className="text-muted-foreground ml-1">/{period}</span>}
                </div>
            </CardHeader>

            <CardContent className="flex-1">
                <ul className="space-y-3">
                    {features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                            <div className={cn(
                                "mr-3 flex h-5 w-5 items-center justify-center rounded-full",
                                feature.included ? "bg-primary/10 text-primary" : "text-muted-foreground bg-muted"
                            )}>
                                {feature.included ? <Check className="h-3 w-3" /> : <span className="h-px w-3 bg-current" />}
                            </div>
                            <span className={cn("text-sm", feature.included ? "text-foreground" : "text-muted-foreground")}>
                                {feature.text}
                            </span>
                        </li>
                    ))}
                </ul>
            </CardContent>

            <CardFooter>
                <Button
                    className="w-full"
                    variant={highlighted ? "default" : buttonVariant}
                    asChild
                >
                    <Link to="/auth?mode=signup">{buttonText}</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
