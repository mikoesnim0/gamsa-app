"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine, Users, Send, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  icon: typeof PenLine;
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  {
    icon: PenLine,
    title: "매일 감사를 기록해요",
    description:
      "하루 3개, 감사한 마음을 적어보세요.\n30초면 충분해요. 작은 것도 괜찮아요.",
  },
  {
    icon: Users,
    title: "감사의 대상을 등록해요",
    description:
      "감사한 사람을 등록하면,\n그 사람에게 보낸 감사가 차곡차곡 쌓여요.",
  },
  {
    icon: Send,
    title: "쌓인 감사가 전달돼요",
    description:
      '100일간 쌓인 감사를 모아\n감사 페이지로 만들어 전달할 수 있어요.\n선물보다 값진, 진심이 도착합니다.',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];
  const StepIcon = step.icon;

  function handleNext() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      router.push("/onboarding/setup");
    }
  }

  function handleSkip() {
    router.push("/onboarding/setup");
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background px-6 py-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* Skip button */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            className="text-sm text-muted-foreground"
            onClick={handleSkip}
          >
            건너뛰기
          </Button>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-secondary">
            <StepIcon className="h-14 w-14 text-primary" />
          </div>

          <div className="space-y-4 text-center">
            <h2 className="font-serif text-2xl font-bold leading-tight">
              {step.title}
            </h2>
            <p className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">
              {step.description}
            </p>
          </div>
        </div>

        {/* Progress & Navigation */}
        <div className="space-y-6 pb-8">
          {/* Dots */}
          <div className="flex justify-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === currentStep
                    ? "w-8 bg-primary"
                    : "w-2 bg-primary/30"
                )}
              />
            ))}
          </div>

          <Button
            className="h-14 w-full rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/40"
            onClick={handleNext}
          >
            {currentStep < STEPS.length - 1 ? (
              <>
                다음 <ChevronRight className="ml-1 h-5 w-5" />
              </>
            ) : (
              <>
                시작하기 <Clock className="ml-1 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
