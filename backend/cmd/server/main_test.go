package main

import (
	"context"
	"math"
	"net/http"
	"net/http/httptest"
	"testing"

	calculatorv1 "go-next/gen/calculator/v1"
	"go-next/gen/calculator/v1/calculatorv1connect"

	"connectrpc.com/connect"
)

// Helper function for comparing floats with a tolerance
func almostEqual(a, b float64) bool {
	return math.Abs(a-b) < 1e-9
}

func TestCalculatorService_Operate(t *testing.T) {
	// 1. Setup the handler
	calculatorHandler := &CalculatorServer{}
	path, handler := calculatorv1connect.NewCalculatorServiceHandler(calculatorHandler)

	// 2. Setup a test server
	mux := http.NewServeMux()
	mux.Handle(path, handler) // Use the correct path from the handler
	server := httptest.NewServer(mux)
	defer server.Close()

	// 3. Create a Connect client pointing to the test server
	client := calculatorv1connect.NewCalculatorServiceClient(
		server.Client(), // Use the test server's http client
		server.URL,      // Use the test server's URL
	)

	// 4. Define test cases
	testCases := []struct {
		name           string
		opA            float64
		opB            float64
		operation      calculatorv1.Operation
		expectedResult float64
		expectedErr    bool
		expectedCode   connect.Code // Expected Connect error code if expectedErr is true
	}{
		{"Add", 10, 5, calculatorv1.Operation_OPERATION_ADD, 15, false, 0},
		{"Subtract", 10, 5, calculatorv1.Operation_OPERATION_SUBTRACT, 5, false, 0},
		{"Multiply", 10, 5, calculatorv1.Operation_OPERATION_MULTIPLY, 50, false, 0},
		{"Divide", 10, 5, calculatorv1.Operation_OPERATION_DIVIDE, 2, false, 0},
		{"Divide by Zero", 10, 0, calculatorv1.Operation_OPERATION_DIVIDE, 0, true, connect.CodeInvalidArgument},
		{"Unsupported Operation", 10, 5, calculatorv1.Operation_OPERATION_UNSPECIFIED, 0, true, connect.CodeInvalidArgument},
		{"Add Negative", -5, 3, calculatorv1.Operation_OPERATION_ADD, -2, false, 0},
		{"Multiply Negative", -5, 3, calculatorv1.Operation_OPERATION_MULTIPLY, -15, false, 0},
	}

	// 5. Run test cases
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			reqProto := &calculatorv1.OperateRequest{
				OperandA:  tc.opA,
				OperandB:  tc.opB,
				Operation: tc.operation,
			}
			req := connect.NewRequest(reqProto)

			resp, err := client.Operate(context.Background(), req)

			if tc.expectedErr {
				if err == nil {
					t.Fatalf("Expected an error, but got nil")
				}
				// Check the Connect error code
				if connectCode := connect.CodeOf(err); connectCode != tc.expectedCode {
					t.Errorf("Expected error code %s, but got %s (error: %v)", tc.expectedCode, connectCode, err)
				}
			} else {
				if err != nil {
					t.Fatalf("Expected no error, but got: %v", err)
				}
				if resp == nil || resp.Msg == nil {
					t.Fatal("Expected a response message, but got nil")
				}
				if !almostEqual(resp.Msg.Result, tc.expectedResult) {
					t.Errorf("Expected result %.9f, but got %.9f", tc.expectedResult, resp.Msg.Result)
				}
			}
		})
	}
}
