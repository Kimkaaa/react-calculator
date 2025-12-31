import { useEffect, useState } from "react";
import Decimal from "decimal.js";

const OPERATORS = ["+", "-", "*", "/"];

/**
 * 계산기 상태
 */
interface CalculatorState {
  currentNumber: string;      // 화면 표시 값 (숫자 문자열 또는 에러 메시지)
  previousNumber: string;     // 이전 피연산자 또는 이전 결과
  operation: string | null;   // 선택된 연산자
  lastOperand: string;        // '=' 반복 입력 시 사용할 마지막 피연산자
  isNewNumber: boolean;       // 새 숫자 입력 여부
  historyExpression: string;  // 상단 연산식 표시
}

/**
 * 초기 상태
 */
const RESET_STATE: CalculatorState = {
  currentNumber: "0",
  previousNumber: "",
  operation: null,
  lastOperand: "",
  isNewNumber: true,
  historyExpression: "",
};

/**
 * 0으로 나누기 에러 상태
 */
const DIVISION_BY_ZERO_STATE: CalculatorState = {
  ...RESET_STATE,
  currentNumber: "0으로 나눌 수 없습니다",
};

/**
 * 연산자 여부 확인
 */
function isOperator(value: string): boolean {
  return OPERATORS.includes(value);
}

/**
 * 문자열 숫자를 안전하게 number로 변환
 */
function toNumberSafe(value: string): number | null {
  const n = parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

/**
 * 사칙연산 수행
 * - 0으로 나누면 null 반환
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
 * 연산자 입력에 따른 상태 전이
 */
function reduceOperator(prev: CalculatorState, operator: string): CalculatorState {
  // 에러 상태에서 연산 입력 시 초기화
  const currentParsed = toNumberSafe(prev.currentNumber);
  if (prev.currentNumber !== "" && currentParsed === null) {
    return RESET_STATE;
  }

  // 1) '=' 반복 입력
  if (
    operator === "=" &&
    prev.isNewNumber &&
    prev.previousNumber &&
    prev.operation &&
    prev.lastOperand
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
      isNewNumber: true,
      historyExpression: `${prev.previousNumber} ${prev.operation} ${prev.lastOperand} =`,
    };
  }

  // 2) 입력 대기 상태 (currentNumber === "")
  if (prev.currentNumber === "") {
    // 연산자 교체
    if (isOperator(operator) && prev.previousNumber && prev.operation) {
      return {
        ...prev,
        operation: operator,
        historyExpression: `${prev.previousNumber} ${operator}`,
      };
    }

    // 7 + = → 7 + 7 =
    if (operator === "=" && prev.previousNumber && prev.operation) {
      const operand = prev.lastOperand || prev.previousNumber;
      const a = toNumberSafe(prev.previousNumber);
      const b = toNumberSafe(operand);
      if (a === null || b === null) return RESET_STATE;

      const result = compute(a, prev.operation, b);
      if (result === null) return DIVISION_BY_ZERO_STATE;

      return {
        currentNumber: result.toString(),
        previousNumber: result.toString(),
        operation: prev.operation,
        lastOperand: operand,
        isNewNumber: true,
        historyExpression: `${prev.previousNumber} ${prev.operation} ${operand} =`,
      };
    }

    return prev;
  }

  // 숫자 입력 후 상태
  const current = currentParsed ?? 0;

  // 3) 결과 직후 연산자 입력
  if (prev.isNewNumber && isOperator(operator) && prev.previousNumber && prev.operation) {
    return {
      currentNumber: "",
      previousNumber: prev.currentNumber,
      operation: operator,
      lastOperand: "",
      isNewNumber: true,
      historyExpression: `${prev.currentNumber} ${operator}`,
    };
  }

  // 4) 연속 연산
  if (prev.previousNumber && prev.operation) {
    const a = toNumberSafe(prev.previousNumber);
    if (a === null) return RESET_STATE;

    const result = compute(a, prev.operation, current);
    if (result === null) return DIVISION_BY_ZERO_STATE;

    // '=' 입력
    if (operator === "=") {
      return {
        currentNumber: result.toString(),
        previousNumber: result.toString(),
        operation: prev.operation,
        lastOperand: prev.currentNumber,
        isNewNumber: true,
        historyExpression: `${prev.previousNumber} ${prev.operation} ${prev.currentNumber} =`,
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
        historyExpression: `${result.toString()} ${operator}`,
      };
    }
  }

  // 5) 첫 연산자 선택
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
    historyExpression: `${current.toString()} ${operator}`,
  };
}

export default function App() {
  // 다크 모드 상태
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 계산기 상태
  const [state, setState] = useState<CalculatorState>(RESET_STATE);

  // body 다크 모드 클래스 제어
  useEffect(() => {
    document.body.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  // 초기화
  const handleClear = () => {
    setState(RESET_STATE);
  };

  // 숫자 입력 (클릭/키보드 공용)
  const handleNumber = (value: string) => {
    setState((prev) => {
      // 새 숫자 시작이거나 0에서 시작하면 치환
      if (prev.isNewNumber || prev.currentNumber === "0") {
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

  // Backspace 처리
  const handleBackspace = () => {
    setState((prev) => {
      // 결과 상태에서는 상단 연산식만 제거
      if (prev.isNewNumber) {
        if (prev.historyExpression.includes("=")) {
          return { ...prev, historyExpression: "" };
        }
        return prev;
      }

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

        {/* 값 변경 시 스크린리더가 읽도록 하는 라이브 영역 */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          현재 값 {state.currentNumber}
        </div>

        <form>
          <div className="display">
            {state.historyExpression && (
              <div className="expression">{state.historyExpression}</div>
            )}
            <input type="text" value={state.currentNumber} readOnly aria-label="현재 값" />
          </div>
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