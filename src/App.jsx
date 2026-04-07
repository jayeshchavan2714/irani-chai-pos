import { useState } from "react";
import { menu } from "./data/menu";
import EscPosEncoder from "esc-pos-encoder";

let bluetoothDevice = null;
let characteristic = null;

function App() {
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState("chai");

  const addItem = (item) => {
    const existing = cart.find((c) => c.id === item.id);

    if (existing) {
      setCart(
        cart.map((c) =>
          c.id === item.id ? { ...c, qty: c.qty + 1 } : c
        )
      );
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const increaseQty = (id) => {
    setCart(
      cart.map((c) =>
        c.id === id ? { ...c, qty: c.qty + 1 } : c
      )
    );
  };

  const decreaseQty = (id) => {
    setCart(
      cart
        .map((c) =>
          c.id === id ? { ...c, qty: c.qty - 1 } : c
        )
        .filter((c) => c.qty > 0)
    );
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  };

  const filteredMenu = menu.filter(
    (item) => item.category === category
  );

  const getNextToken = () => {
    let token = localStorage.getItem("token_no");

    if (!token) {
      token = 1;
    } else {
      token = parseInt(token) + 1;
    }

    localStorage.setItem("token_no", token);
    return token;
  };

  const handlePrint = async () => {
    if (cart.length === 0) return;

    const token = getNextToken();

    const orderData = {
      token,
      items: cart,
      total: getTotal(),
      time: new Date().toLocaleString(),
    };

    const lines = formatReceiptLines(orderData);

    await printReceipt(lines);

    setCart([]);
  };

  const formatReceiptLines = (data) => {
    const lines = [];

    lines.push("IRANI CHAI BUN MASKA");
    lines.push("------------------------------");
    lines.push(`Token: ${data.token}`);
    lines.push(`${data.time}`);
    lines.push("------------------------------");

    data.items.forEach((item) => {
      const total = item.price * item.qty;
      lines.push(`${item.name} x${item.qty} ₹${total}`);
    });

    lines.push("------------------------------");
    lines.push(`TOTAL: ₹${data.total}`);
    lines.push("------------------------------");

    return lines;
  };

  const printReceipt = async (lines) => {
    if (!characteristic) {
      alert("Connect printer first");
      return;
    }

    const encoder = new EscPosEncoder();

    let encoded = encoder.initialize();

    lines.forEach((line, index) => {
      if (index === 0) {
        encoded = encoded.align("center").line(line);
      } else {
        encoded = encoded.align("left").line(line);
      }
    });

    const data = encoded.cut().encode();

    try {
      await characteristic.writeValue(data);
    } catch (err) {
      console.error(err);
      alert("Print failed ❌");
    }
  };

  const connectPrinter = async () => {
    try {
      bluetoothDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [0xFFE0],
      });

      const server = await bluetoothDevice.gatt.connect();
      const service = await server.getPrimaryService(0xFFE0);
      characteristic = await service.getCharacteristic(0xFFE1);

      alert("Printer connected ✅");
    } catch (error) {
      console.error(error);
      alert("Connection failed ❌");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        fontFamily: "sans-serif",
      }}
    >
      {/* LEFT: MENU */}
      <div style={{ flex: 1.8, padding: 15 }}>
        <h2>Menu</h2>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          {["chai", "snacks", "bakery"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                flex: 1,
                padding: 12,
                background: category === cat ? "black" : "#ddd",
                color: category === cat ? "white" : "black",
                borderRadius: 10,
                fontWeight: "bold",
              }}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 15,
          maxHeight: "80vh",
          overflowY: "auto"
        }}>
          {filteredMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => addItem(item)}
              style={{
                padding: 30,
                fontSize: 20,
                background: "#f5f5f5",
                border: "1px solid #ddd",
                borderRadius: 12,
                fontWeight: "bold",
                transition: "0.1s",
              }}
              onMouseDown={(e) => e.target.style.background = "#ddd"}
              onMouseUp={(e) => e.target.style.background = "#f5f5f5"}
            >
              {item.name}
              <br />₹{item.price}
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT: CART */}
      <div
        style={{
          flex: 1.2,
          padding: 15,
          borderLeft: "2px solid #ddd",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h2>Order</h2>

          {cart.length === 0 && <p>No items added</p>}

          {cart.map((item) => (
            <div
              key={item.id}
              style={{
                marginBottom: 15,
                paddingBottom: 10,
                borderBottom: "1px solid #eee",
              }}
            >
              <div style={{ fontWeight: "bold" }}>{item.name}</div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginTop: 5,
                }}
              >
                <button
                  onClick={() => decreaseQty(item.id)}
                  style={{
                    padding: "5px 10px",
                    fontSize: 18,
                  }}
                >
                  -
                </button>

                <span style={{ margin: "0 10px", fontSize: 18 }}>
                  {item.qty}
                </span>

                <button
                  onClick={() => increaseQty(item.id)}
                  style={{
                    padding: "5px 10px",
                    fontSize: 18,
                  }}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div>
          <h3>Total: ₹{getTotal()}</h3>

          <button
            onClick={() => setCart([])}
            style={{
              width: "100%",
              padding: 15,
              marginBottom: 10,
              background: "#ccc",
              borderRadius: 10,
              fontSize: 16,
            }}
          >
            CLEAR
          </button>

          <button
            onClick={connectPrinter}
            style={{
              width: "100%",
              padding: 12,
              marginBottom: 10,
              background: "green",
              color: "white",
              borderRadius: 10,
            }}
          >
            CONNECT PRINTER
          </button>

          <button
            style={{
              width: "100%",
              padding: 25,
              fontSize: 22,
              background: "black",
              color: "white",
              borderRadius: 12,
              fontWeight: "bold",
            }}
            onClick={handlePrint}
          >
            PRINT TOKEN
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;