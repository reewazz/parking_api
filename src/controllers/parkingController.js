import Parking from "../models/Parking.js";
import Payment from "../models/Payment.js";
import Reservation from "../models/Reservation.js";

export const enterParking = async (req, res) => {
  const admin = req.user.userId;
  const reservation = req.body.reservation;

  try {
    const parking = new Parking({
      reservation,
      admin,
    });

    await parking.save();

    res.status(201).json({ message: "Parking entry created successfully", parking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const exitParking = async (req, res) => {
  try {
    const { id } = req.params;
    const parking = await Parking.findById(id);

    if (!parking) {
      return res.status(404).json({ message: "Parking entry not found" });
    }

    if (parking.status === "Exited") {
      return res.status(400).json({ message: "Parking already marked as exited" });
    }

    parking.exitedTime = Date.now();
    parking.status = "Payment Pending";

    // parking.duration is calculated as the difference between parking.exitedTime and parking.enteredTime in milliseconds.
    // To convert this to minutes, you're dividing by (1000 * 60). This calculation results in the duration of the parking session in minutes.
    parking.duration = Math.floor((parking.exitedTime - parking.enteredTime) / (1000 * 60));

    const reservation = await Reservation.findById(parking.reservation).populate("parkingSpot");

    // Calculate the parking.totalAmount by multiplying the duration in minutes by the parking spot's hourly rate (pricePerHour).
    // This calculation gives you the total cost of parking for that duration.
    parking.totalAmount = (parking.duration / 60) * reservation.parkingSpot.pricePerHour;

    // Limit the totalAmount to two decimal places using toFixed()
    parking.totalAmount = parseFloat(parking.totalAmount.toFixed(2));

    await parking.save();
    res.status(200).json({ message: "Parking updated successfully. Payment is pending.", parking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const validatePaymentAndExit = async (req, res) => {
  const { id } = req.params;

  try {
    const parking = await Parking.findById(id);
    if (!parking) {
      return res.status(404).json({ message: "Parking entry not found" });
    }

    const payment = await Payment.findOne({ parking: id });
    if (!payment || payment.paymentStatus !== "Successful") {
      return res.status(400).json({ message: "Payment not verified" });
    }

    parking.status = "Exited";
    await parking.save();
    res.status(200).json({ message: "Vehicle is allowed to exit" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getParkings = async (req, res) => {
  try {
    const parkings = await Parking.find().populate("payment");

    res.status(200).json({ parkings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getTotal = async (req, res) => {
  try {
    const total = await Parking.countDocuments();

    res.status(200).json({ total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getParking = async (req, res) => {
  try {
    const { id } = req.params;

    const parking = await Parking.findById(id)
      .populate({
        path: "reservation",
      })
      .populate("payment");

    if (!parking) {
      return res.status(404).json({ message: "Parking entry not found" });
    }

    res.status(200).json({ parking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getParkingByUser = async (req, res) => {
  try {
    const userId = req.user.userId;

    const parking = await Parking.find({})
      .populate({
        path: "reservation",
      })
      .populate("payment");

    const filteredParking = parking.filter((entry) => entry.reservation.customer.toString() === userId);
    if (filteredParking.length === 0) {
      return res.status(404).json({ message: "Parking entry not found" });
    }

    res.status(200).json({ parking: parking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteParking = async (req, res) => {
  try {
    const { id } = req.params;

    const parking = await Parking.findById(id);
    if (!parking) {
      return res.status(404).json({ message: "Parking entry not found" });
    }

    await parking.remove();
    res.status(200).json({ message: "Parking entry deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
