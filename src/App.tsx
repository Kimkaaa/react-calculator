import { useEffect, useState } from "react";
import Decimal from "decimal.js";

interface CalculatorState {
  currentNumber: string;     // 현재 입력 중인 숫자
  previousNumber: string;    // 이전에 입력한 숫자
  operation: string | null;  // 연산 기호 또는 null
  isNewNumber: boolean;      // 새로운 숫자 입력 여부
}

export default function App() {
  // 다크 모드 상태
  const [isDarkMode, setIsDarkMode] = useState(false);

  // body 다크 모드 클래스 제어
  useEffect(() => {
    document.body.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  // 계산기 상태 관리
  const [state, setState] = useState<CalculatorState>({
    currentNumber: '0',   // 화면에 표시되는 값
    previousNumber: '',   // 연산자 선택 전 값
    operation: null,      // 선택된 연산자
    isNewNumber: true,    // 새 숫자 입력 여부
  });

  // 숫자 입력 (클릭/키보드 공용)
  const handleNumber = (value: string) => {
    setState((prev) => {
      if (prev.isNewNumber) {
        return { ...prev, currentNumber: value, isNewNumber: false };
      }
      // 0에서 시작할 때 "0" -> "5" 치환
      if (prev.currentNumber === "0") return { ...prev, currentNumber: value, isNewNumber: false };
      return { ...prev, currentNumber: prev.currentNumber + value };
    });
  };

  // 연산 처리 (클릭/키보드 공용)
  const handleOperator = (operator: string) => {
    setState((prev) => {
      if (prev.currentNumber === "") {
        // 이미 previousNumber가 있고 operation이 있으면, 연산자만 교체 허용
        if (prev.previousNumber !== "" && prev.operation) {
          return { ...prev, operation: operator };
        }
        return prev;
      }

      const current = parseFloat(prev.currentNumber || "0");

      // 연속 연산
      if (prev.previousNumber !== "" && prev.operation) {
        const prevNum = parseFloat(prev.previousNumber);
        let result = 0;

        switch (prev.operation) {
          case "+":
            result = new Decimal(prevNum).plus(current).toNumber();
            break;
          case "-":
            result = new Decimal(prevNum).minus(current).toNumber();
            break;
          case "*":
            result = new Decimal(prevNum).times(current).toNumber();
            break;
          case "/":
            result = new Decimal(prevNum).dividedBy(current).toNumber();
            break;
        }

        if (operator === "=") {
          return {
            currentNumber: result.toString(),
            previousNumber: "",
            operation: null,
            isNewNumber: true,
          };
        }

        return {
          currentNumber: "",
          previousNumber: result.toString(),
          operation: operator,
          isNewNumber: true,
        };
      }

      // 첫 번째 숫자 입력 후 연산자 선택
      if (operator === "=") {
        // 이전 연산이 없는 상태에서 '=' 누른 경우는 유지
        return { ...prev, isNewNumber: true };
      }

      return {
        currentNumber: "",
        previousNumber: current.toString(),
        operation: operator,
        isNewNumber: true,
      };
    });
  };

  // C 버튼 클릭 처리 함수: 모든 상태 초기화
  const handleClear = () => {
    setState({
      currentNumber: '0',
      previousNumber: '',
      operation: null,
      isNewNumber: true,
    });
  };

  // 소수점 버튼 클릭 처리 함수: 현재 숫자에 소수점이 없을 경우에만 추가
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

      // 연산자
      if (key === "+" || key === "-" || key === "*" || key === "/") {
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