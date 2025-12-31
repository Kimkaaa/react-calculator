import { useEffect, useState } from "react";
import Decimal from "decimal.js";

const OPERATORS = ["+", "-", "*", "/"];

interface CalculatorState {
  currentNumber: string;     // 화면에 표시되는 현재 입력값
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
    setState((prev) => {
      const current = parseFloat(prev.currentNumber || "0");

      // 숫자가 아닌 화면(에러 메시지 등)인 상태에서 연산이 들어오면 초기화
      if (prev.currentNumber !== "" && Number.isNaN(current)) {
        return RESET_STATE;
      }

      // 계산 함수(사칙연산)
      const compute = (a: number, op: string, b: number) => {
        switch (op) {
          case "+":
            return new Decimal(a).plus(b).toNumber();
          case "-":
            return new Decimal(a).minus(b).toNumber();
          case "*":
            return new Decimal(a).times(b).toNumber();
          case "/":
            if (b === 0) return null; // 0으로 나누기 예외 신호
            return new Decimal(a).dividedBy(b).toNumber();
          default:
            return undefined; // 지원하지 않는 연산자 방어 처리
        }
      };

      // --- 1) '=' 반복 입력(결과 상태에서 '=' 다시 누름) ---
      // 예: 7 + 3 + 2 = (=) -> 14, (=) -> 16 ...
      if (
        operator === "=" &&
        prev.isNewNumber &&
        prev.previousNumber !== "" &&
        prev.operation &&
        prev.lastOperand !== ""
      ) {
        const a = parseFloat(prev.previousNumber);
        const b = parseFloat(prev.lastOperand);

        const result = compute(a, prev.operation, b);
        if (result === null) return DIVISION_BY_ZERO_STATE;
        if (result === undefined) return prev;

        return {
          ...prev,
          currentNumber: result.toString(),
          previousNumber: result.toString(),
          // operation, lastOperand 유지 → 계속 '=' 반복 가능
          isNewNumber: true,
        };
      }

      // --- 2) currentNumber가 비어있는 상태(연산자 입력 직후) ---
      if (prev.currentNumber === "") {
        // 2-1) 연산자 연속 입력: 사칙연산이면 연산자만 교체
        if (OPERATORS.includes(operator) && prev.previousNumber !== "" && prev.operation) {
          return { ...prev, operation: operator };
        }

        // 2-2) 예: 7 + =  → 7 + 7 = 14
        // lastOperand가 없으면 previousNumber를 반복 피연산자로 사용
        if (operator === "=" && prev.previousNumber !== "" && prev.operation) {
          const a = parseFloat(prev.previousNumber);
          const operandStr = prev.lastOperand !== "" ? prev.lastOperand : prev.previousNumber;
          const b = parseFloat(operandStr);

          const result = compute(a, prev.operation, b);
          if (result === null) return DIVISION_BY_ZERO_STATE;
          if (result === undefined) return prev;

          return {
            currentNumber: result.toString(),
            previousNumber: result.toString(),
            operation: prev.operation,   // 유지해야 '=' 반복 가능
            lastOperand: operandStr,     // 반복 피연산자 기억
            isNewNumber: true,
          };
        }

        // 그 외는 무시
        return prev;
      }

      // --- 3) currentNumber가 있는 상태(숫자 입력 후) ---

      // 3-0) 결과(=) 직후에 새 연산자 입력: 기존 operation으로 연속 계산하지 말고 새 연산 시작
      // 예: 9 - 4 = (5) → + 3 = → 8
      if (
        prev.isNewNumber &&
        OPERATORS.includes(operator) &&
        prev.currentNumber !== "" &&
        prev.previousNumber !== "" &&
        prev.operation
      ) {
        // 결과값을 새 연산의 시작점으로
        return {
          currentNumber: "",
          previousNumber: prev.currentNumber, // 결과값을 새 연산의 첫 피연산자로 사용
          operation: operator,                // 새 연산자
          lastOperand: "",                    // 새 연산 시작 → 반복 피연산자 초기화
          isNewNumber: true,
        };
      }

      // 3-1) 연속 연산(previousNumber와 operation이 있는 상태)
      if (prev.previousNumber !== "" && prev.operation) {
        const a = parseFloat(prev.previousNumber);
        const b = current;

        const result = compute(a, prev.operation, b);
        if (result === null) return DIVISION_BY_ZERO_STATE;
        if (result === undefined) return prev;

        // '='이면 결과 표시 + 반복용 상태 저장
        if (operator === "=") {
          return {
            currentNumber: result.toString(),
            previousNumber: result.toString(),
            operation: prev.operation,          // 유지 → '=' 반복 가능
            lastOperand: prev.currentNumber,    // 방금 사용한 숫자를 기억(예: +2 반복)
            isNewNumber: true,
          };
        }

        // 다음 연산 이어가기(사칙연산만)
        if (OPERATORS.includes(operator)) {
          return {
            currentNumber: "",
            previousNumber: result.toString(),
            operation: operator,
            lastOperand: prev.currentNumber, // 최근 피연산자 갱신(반복 '='에 사용)
            isNewNumber: true,
          };
        }

        return prev;
      }

      // 3-2) 첫 연산자 선택(previousNumber 없음)
      if (operator === "=") {
        // 첫 연산이 없는 상태에서 '=' 입력은 변화 없음
        return { ...prev, isNewNumber: true };
      }

      // 첫 연산자 입력: 현재 숫자를 첫 피연산자로 저장하고 연산 대기 상태로 전환
      if (!OPERATORS.includes(operator)) return prev;

      return {
        currentNumber: "",
        previousNumber: current.toString(),
        operation: operator,
        lastOperand: current.toString(), // 결과 이후 연산 시작 시, 반복 '=' 기준 피연산자로 사용
        isNewNumber: true,
      };
    });
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
      if (OPERATORS.includes(key)) {
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
      >
        {isDarkMode ? "☀️" : "🌙"}
      </button>

      <article className={`calculator ${isDarkMode ? "dark" : ""}`}>
        <form name="forms">
          <input type="text" name="output" value={state.currentNumber} readOnly />
          <input type="button" className="clear" value="C" onClick={handleClear} />
          <input type="button" className="operator" value="/" onClick={onOperatorClick} />
          <input type="button" value="1" onClick={onNumberClick} />
          <input type="button" value="2" onClick={onNumberClick} />
          <input type="button" value="3" onClick={onNumberClick} />
          <input type="button" className="operator" value="*" onClick={onOperatorClick} />
          <input type="button" value="4" onClick={onNumberClick} />
          <input type="button" value="5" onClick={onNumberClick} />
          <input type="button" value="6" onClick={onNumberClick} />
          <input type="button" className="operator" value="+" onClick={onOperatorClick} />
          <input type="button" value="7" onClick={onNumberClick} />
          <input type="button" value="8" onClick={onNumberClick} />
          <input type="button" value="9" onClick={onNumberClick} />
          <input type="button" className="operator" value="-" onClick={onOperatorClick} />
          <input type="button" className="dot" value="." onClick={handleDot} />
          <input type="button" value="0" onClick={onNumberClick} />
          <input type="button" className="operator result" value="=" onClick={onOperatorClick} />
        </form>
      </article>
    </>
  );
}