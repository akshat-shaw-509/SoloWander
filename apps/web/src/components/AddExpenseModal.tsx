"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { createExpense } from "@/app/dashboard/actions";

type TripOption = {
  id: string;
  destination: string;
};

type AddExpenseModalProps = {
  trips: TripOption[];
  defaultTripId?: string;
};

const categories = [
  "Stay",
  "Food",
  "Transport",
  "Activities",
  "Shopping",
  "Other",
];

export default function AddExpenseModal({
  trips,
  defaultTripId,
}: AddExpenseModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white"
      >
        <Plus className="h-4 w-4" />
        Add Expense
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold">
                Add expense
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500"
                aria-label="Close"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              action={async (formData) => {
                await createExpense(formData);
                setIsOpen(false);
              }}
              className="space-y-4 p-5"
            >
              <div>
                <label
                  htmlFor="expense-name"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Name
                </label>
                <input
                  id="expense-name"
                  name="name"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                  placeholder="Hostel dorm, train ticket..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="expense-amount"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Amount
                  </label>
                  <input
                    id="expense-amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                    placeholder="750"
                  />
                </div>

                <div>
                  <label
                    htmlFor="expense-category"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Category
                  </label>
                  <select
                    id="expense-category"
                    name="category"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="expense-trip"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Trip
                  </label>
                  <select
                    id="expense-trip"
                    name="trip_id"
                    defaultValue={defaultTripId ?? ""}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="">No trip</option>
                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.destination}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="expense-date"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Date
                  </label>
                  <input
                    id="expense-date"
                    name="expense_date"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="expense-notes"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Notes
                </label>
                <textarea
                  id="expense-notes"
                  name="notes"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-orange-100"
                  placeholder="Optional details"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white"
                >
                  Save expense
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
