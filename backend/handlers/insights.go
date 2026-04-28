package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

type InsightsHandler struct {
	DB *sql.DB
}

type groqRequest struct {
	Model    string        `json:"model"`
	Messages []groqMessage `json:"messages"`
}

type groqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type groqResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (h *InsightsHandler) Generate(w http.ResponseWriter, r *http.Request) {
	apiKey := getEnv("GROQ_API_KEY", "")
	if apiKey == "" {
		writeError(w, http.StatusServiceUnavailable, "AI insights not configured")
		return
	}

	userID := userIDFromCtx(r.Context())

	var totalRevenue, totalExpenses, inventoryValue, totalSales float64
	var totalProducts, lowStockCount int
	h.DB.QueryRow("SELECT COALESCE(SUM(amount),0) FROM transactions WHERE user_id=? AND type='income'", userID).Scan(&totalRevenue)
	h.DB.QueryRow("SELECT COALESCE(SUM(amount),0) FROM transactions WHERE user_id=? AND type='expense'", userID).Scan(&totalExpenses)
	h.DB.QueryRow("SELECT COALESCE(SUM(CAST(quantity AS DECIMAL)*unit_price),0) FROM products WHERE user_id=?", userID).Scan(&inventoryValue)
	h.DB.QueryRow("SELECT COALESCE(SUM(total_amount),0) FROM sales WHERE user_id=?", userID).Scan(&totalSales)
	h.DB.QueryRow("SELECT COUNT(*) FROM products WHERE user_id=?", userID).Scan(&totalProducts)
	h.DB.QueryRow("SELECT COUNT(*) FROM products WHERE user_id=? AND quantity<=reorder_level", userID).Scan(&lowStockCount)

	type topProduct struct{ Name string; Total float64 }
	var topProducts []topProduct
	rows, _ := h.DB.Query(`
		SELECT COALESCE(p.name,'Unknown'), SUM(s.total_amount)
		FROM sales s LEFT JOIN products p ON s.product_id=p.id
		WHERE s.user_id=? GROUP BY s.product_id, p.name ORDER BY SUM(s.total_amount) DESC LIMIT 3`, userID)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var tp topProduct
			rows.Scan(&tp.Name, &tp.Total)
			topProducts = append(topProducts, tp)
		}
	}

	type monthlyRow struct{ Month string; Revenue, Expenses float64 }
	var monthly []monthlyRow
	rows2, _ := h.DB.Query(`
		SELECT DATE_FORMAT(date,'%Y-%m'),
		SUM(CASE WHEN type='income' THEN amount ELSE 0 END),
		SUM(CASE WHEN type='expense' THEN amount ELSE 0 END)
		FROM transactions WHERE user_id=? AND date>=DATE_SUB(CURDATE(),INTERVAL 6 MONTH)
		GROUP BY DATE_FORMAT(date,'%Y-%m') ORDER BY 1`, userID)
	if rows2 != nil {
		defer rows2.Close()
		for rows2.Next() {
			var m monthlyRow
			rows2.Scan(&m.Month, &m.Revenue, &m.Expenses)
			monthly = append(monthly, m)
		}
	}

	topProductsStr := "none yet"
	if len(topProducts) > 0 {
		topProductsStr = ""
		for _, tp := range topProducts {
			topProductsStr += fmt.Sprintf("%s ($%.2f), ", tp.Name, tp.Total)
		}
	}

	monthlyStr := "no data yet"
	if len(monthly) > 0 {
		monthlyStr = ""
		for _, m := range monthly {
			monthlyStr += fmt.Sprintf("%s: revenue $%.2f / expenses $%.2f; ", m.Month, m.Revenue, m.Expenses)
		}
	}

	prompt := fmt.Sprintf(`You are a concise business analyst. Analyze this data and give exactly 5 short, specific, actionable insights. Each insight should be 1-2 sentences. Be direct and specific to the numbers — no generic advice.

Business data:
- Total revenue (all time): $%.2f
- Total expenses (all time): $%.2f
- Net profit: $%.2f
- Inventory value: $%.2f
- Total products: %d (%d at or below reorder level)
- Total sales revenue: $%.2f
- Top products by sales: %s
- Monthly trend (last 6 months): %s

Format your response as exactly 5 bullet points starting with •`,
		totalRevenue, totalExpenses, totalRevenue-totalExpenses,
		inventoryValue, totalProducts, lowStockCount, totalSales,
		topProductsStr, monthlyStr,
	)

	reqBody, _ := json.Marshal(groqRequest{
		Model:    "llama-3.1-8b-instant",
		Messages: []groqMessage{{Role: "user", Content: prompt}},
	})

	req, _ := http.NewRequest("POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewReader(reqBody))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("content-type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		writeError(w, http.StatusBadGateway, "could not reach AI service")
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var groqResp groqResponse
	if err := json.Unmarshal(respBody, &groqResp); err != nil {
		writeError(w, http.StatusBadGateway, "could not parse AI response")
		return
	}
	if groqResp.Error != nil {
		writeError(w, http.StatusBadGateway, "AI error: "+groqResp.Error.Message)
		return
	}
	if len(groqResp.Choices) == 0 {
		writeError(w, http.StatusBadGateway, "empty response from AI")
		return
	}

	raw := groqResp.Choices[0].Message.Content
	var points []string
	for _, line := range strings.Split(raw, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		line = strings.TrimPrefix(line, "•")
		line = strings.TrimPrefix(line, "-")
		line = strings.TrimPrefix(line, "*")
		line = strings.TrimSpace(line)
		if line != "" {
			points = append(points, line)
		}
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"insights": points})
}
