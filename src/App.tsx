export default function App() {
  return (
    <article className="calculator">
      <form name="forms">
        <input type="text" name="output" readOnly />
        <input type="button" className="clear" value="C" />
        <input type="button" className="operator" value="/" />
        <input type="button" value="1" />
        <input type="button" value="2" />
        <input type="button" value="3" />
        <input type="button" className="operator" value="*" />
        <input type="button" value="4" />
        <input type="button" value="5" />
        <input type="button" value="6" />
        <input type="button" className="operator" value="+" />
        <input type="button" value="7" />
        <input type="button" value="8" />
        <input type="button" value="9" />
        <input type="button" className="operator" value="-" />
        <input type="button" className="dot" value="." />
        <input type="button" value="0" />
        <input type="button" className="operator result" value="=" />
      </form>
    </article>
  );
}