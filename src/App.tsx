import { useEffect, useState } from "react";
import Decimal from "decimal.js";

const OPERATORS = ["+", "-", "*", "/"];

interface CalculatorState {
  currentNumber: string;     // 화면 표시(숫자 문자열 or 에러 메시지)
  previousNumber: string;    // 이전 연산 결과 또는 첫 번째 피연산자
  operation: string | null;  // 선택된 연산자(+, -, *, /) 또는 null
  lastOperand: string;       // '=' 반복 입력 시 사용할 마지막 피연산자
  isNewNumber: boolean;      // 다음 숫자 입력 시 새로 시작할지 여부
}

const RESET_STATE: CalculatorState = {
  currentNumber: "0",
  previousNumber: "",
  operation: null,
  lastOperand: "",
  isNewNumber: true,
};

const DIVISION_BY_ZERO_STATE: CalculatorState = {
  ...RESET_STATE,
  currentNumber: "0으로 나눌 수 없습니다",
};

function isOperator(value: string): boolean {
  return OPERATORS.includes(value);
}

function toNumberSafe(value: string): number | null {
  const n = parseFloat(value || "0");
  return Number.isNaN(n) ? null : n;
}

/**
 * 사칙연산 수행
 * - 0으로 나누면 null 반환(에러 신호)
 */
function compute(a: number, op: string, b: number): number | null {
  switch (op) {
    case "+":
      return new Decimal(a).plus(b).toNumber();
    case "-":
      return new Decimal(a).minus(b).toNumber();
    case "*":
      return new Decimal(a).times(b).toNumber();
    case "/":
      if (b === 0) return null;
      return new Decimal(a).dividedBy(b).toNumber();
    default:
      return null;
  }
}

/**
 * 연산자 입력에 대한 상태 전이
 */
function reduceOperator(prev: CalculatorState, operator: string): CalculatorState {
  // 숫자가 아닌 화면(에러 메시지 등)에서 연산이 들어오면 초기화
  const currentParsed = toNumberSafe(prev.currentNumber);
  if (prev.currentNumber !== "" && currentParsed === null) {
    return RESET_STATE;
  }

  // 1) '=' 반복 입력: 결과 상태에서 '=' 다시 누름
  if (
    operator === "=" &&
    prev.isNewNumber &&
    prev.previousNumber !== "" &&
    prev.operation &&
    prev.lastOperand !== ""
  ) {
    const a = toNumberSafe(prev.previousNumber);
    const b = toNumberSafe(prev.lastOperand);
    if (a === null || b === null) return RESET_STATE;

    const result = compute(a, prev.operation, b);
    if (result === null) return DIVISION_BY_ZERO_STATE;

    return {
      ...prev,
      currentNumber: result.toString(),
      previousNumber: result.toString(),
      // operation, lastOperand 유지
      isNewNumber: true,
    };
  }

  // 2) 입력 대기 상태(currentNumber === "")
  if (prev.currentNumber === "") {
    // 2-1) 연산자 연속 입력: 연산자만 교체
    if (isOperator(operator) && prev.previousNumber !== "" && prev.operation) {
      return { ...prev, operation: operator };
    }

    // 2-2) 예: 7 + = → 7 + 7 = 14 (lastOperand 없으면 previousNumber 재사용)
    if (operator === "=" && prev.previousNumber !== "" && prev.operation) {
      const a = toNumberSafe(prev.previousNumber);
      const operandStr = prev.lastOperand !== "" ? prev.lastOperand : prev.previousNumber;
      const b = toNumberSafe(operandStr);
      if (a === null || b === null) return RESET_STATE;

      const result = compute(a, prev.operation, b);
      if (result === null) return DIVISION_BY_ZERO_STATE;

      return {
        currentNumber: result.toString(),
        previousNumber: result.toString(),
        operation: prev.operation, // 유지 → '=' 반복 가능
        lastOperand: operandStr,   // 반복 피연산자 기억
        isNewNumber: true,
      };
    }

    return prev;
  }

  // 3) 숫자 입력 후(currentNumber !== "")
  const current = currentParsed ?? 0;

  // 3-0) 결과 직후에 새 연산자 입력: 새 연산 시작
  if (
    prev.isNewNumber &&
    isOperator(operator) &&
    prev.currentNumber !== "" &&
    prev.previousNumber !== "" &&
    prev.operation
  ) {
    return {
      currentNumber: "",
      previousNumber: prev.currentNumber,
      operation: operator,
      lastOperand: "",
      isNewNumber: true,
    };
  }

  // 3-1) 연속 연산(previousNumber + operation이 이미 있음)
  if (prev.previousNumber !== "" && prev.operation) {
    const a = toNumberSafe(prev.previousNumber);
    if (a === null) return RESET_STATE;

    const result = compute(a, prev.operation, current);
    if (result === null) return DIVISION_BY_ZERO_STATE;

    // '='이면 결과 표시 + 반복용 상태 저장
    if (operator === "=") {
      return {
        currentNumber: result.toString(),
        previousNumber: result.toString(),
        operation: prev.operation,       // 유지 → '=' 반복 가능
        lastOperand: prev.currentNumber, // 방금 사용한 숫자 기억
        isNewNumber: true,
      };
    }

    // 다음 연산 이어가기
    if (isOperator(operator)) {
      return {
        currentNumber: "",
        previousNumber: result.toString(),
        operation: operator,
        lastOperand: prev.currentNumber,
        isNewNumber: true,
      };
    }

    return prev;
  }

  // 3-2) 첫 연산자 선택(previousNumber 없음)
  if (operator === "=") {
    return { ...prev, isNewNumber: true };
  }

  if (!isOperator(operator)) return prev;

  return {
    currentNumber: "",
    previousNumber: current.toString(),
    operation: operator,
    lastOperand: current.toString(),
    isNewNumber: true,
  };
}

export default function App() {
  // 다크 모드 상태
  const [isDarkMode, setIsDarkMode] = useState(false);

  // body 다크 모드 클래스 제어
  useEffect(() => {
    document.body.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  // 계산기 상태 관리
  const [state, setState] = useState<CalculatorState>(RESET_STATE);

  // 초기화
  const handleClear = () => {
    setState(RESET_STATE);
  };

  // 숫자 입력 (클릭/키보드 공용)
  const handleNumber = (value: string) => {
    setState((prev) => {
      if (prev.isNewNumber) {
        return { ...prev, currentNumber: value, isNewNumber: false };
      }

      // 0에서 시작할 때 "0" -> "5" 치환
      if (prev.currentNumber === "0") {
        return { ...prev, currentNumber: value, isNewNumber: false };
      }

      return { ...prev, currentNumber: prev.currentNumber + value };
    });
  };

  // 소수점 입력
  const handleDot = () => {
    setState((prev) => {
      // 새 숫자 시작이면 "0."부터
      if (prev.isNewNumber) {
        return { ...prev, currentNumber: "0.", isNewNumber: false };
      }
      if (prev.currentNumber.includes(".")) return prev;

      return { ...prev, currentNumber: prev.currentNumber + ".", isNewNumber: false };
    });
  };

  // Backspace 지원
  const handleBackspace = () => {
    setState((prev) => {
      if (prev.isNewNumber) return prev;

      if (prev.currentNumber.length <= 1) {
        return { ...prev, currentNumber: "0", isNewNumber: true };
      }

      return { ...prev, currentNumber: prev.currentNumber.slice(0, -1) };
    });
  };

  // 연산 처리 (클릭/키보드 공용)
  const handleOperator = (operator: string) => {
    setState((prev) => reduceOperator(prev, operator));
  };

  // 공용 클릭 핸들러
  const onNumberClick = (e: React.MouseEvent<HTMLInputElement>) => {
    handleNumber(e.currentTarget.value);
  };

  const onOperatorClick = (e: React.MouseEvent<HTMLInputElement>) => {
    handleOperator(e.currentTarget.value);
  };

  // 키보드 입력
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      // 숫자
      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        handleNumber(key);
        return;
      }

      // 소수점
      if (key === ".") {
        e.preventDefault();
        handleDot();
        return;
      }

      // 연산자(+ - * /)
      if (isOperator(key)) {
        e.preventDefault();
        handleOperator(key);
        return;
      }

      // 결과 (= / Enter)
      if (key === "Enter" || key === "=") {
        e.preventDefault();
        handleOperator("=");
        return;
      }

      // 초기화 (Esc / c / C)
      if (key === "Escape" || key === "c" || key === "C") {
        e.preventDefault();
        handleClear();
        return;
      }

      // Backspace
      if (key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        className="theme-toggle"
        onClick={() => setIsDarkMode((prev) => !prev)}
        aria-pressed={isDarkMode}
        aria-label={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
      >
        {isDarkMode ? "☀️" : "🌙"}
      </button>

      <article className={`calculator ${isDarkMode ? "dark" : ""}`} aria-label="계산기">

        {/* 값 변경 시 스크린리더가 읽도록 라이브 영역 추가 */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          현재 값 {state.currentNumber}
        </div>

        <form name="forms">
          <input type="text" name="output" value={state.currentNumber} readOnly aria-label="현재 값" />
          <input type="button" className="clear" value="C" onClick={handleClear} aria-label="초기화" />
          <input type="button" className="operator" value="/" onClick={onOperatorClick} aria-label="나누기" />
          <input type="button" value="1" onClick={onNumberClick} />
          <input type="button" value="2" onClick={onNumberClick} />
          <input type="button" value="3" onClick={onNumberClick} />
          <input type="button" className="operator" value="*" onClick={onOperatorClick} aria-label="곱하기" />
          <input type="button" value="4" onClick={onNumberClick} />
          <input type="button" value="5" onClick={onNumberClick} />
          <input type="button" value="6" onClick={onNumberClick} />
          <input type="button" className="operator" value="+" onClick={onOperatorClick} aria-label="더하기" />
          <input type="button" value="7" onClick={onNumberClick} />
          <input type="button" value="8" onClick={onNumberClick} />
          <input type="button" value="9" onClick={onNumberClick} />
          <input type="button" className="operator" value="-" onClick={onOperatorClick} aria-label="빼기" />
          <input type="button" className="dot" value="." onClick={handleDot} aria-label="소수점" />
          <input type="button" value="0" onClick={onNumberClick} />
          <input type="button" className="operator result" value="=" onClick={onOperatorClick} aria-label="계산 결과"/>
        </form>
      </article>
    </>
  );
}