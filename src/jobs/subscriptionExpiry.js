const cron = require("node-cron");
const { Op } = require("sequelize");
const { DoctorSubscription, Doctor, User } = require("../models");

const GRACE_DAYS = 7;

// Runs every day at 01:00
cron.schedule("0 1 * * *", async () => {
  const today = new Date().toISOString().slice(0, 10);

  //  active → grace (expired today or earlier, no grace set yet)
  const toGrace = await DoctorSubscription.findAll({
    where: {
      status: "active",
      expires_at: { [Op.lte]: today },
    },
    include: [{ model: Doctor, as: "Doctor", include: [{ model: User }] }],
  });

  for (const sub of toGrace) {
    const graceEnd = new Date();
    graceEnd.setDate(graceEnd.getDate() + GRACE_DAYS);
    await sub.update({
      status: "grace",
      grace_ends_at: graceEnd.toISOString().slice(0, 10),
    });
    console.log(
      `[cron] Sub ${sub.id} → grace until ${graceEnd.toISOString().slice(0, 10)}`,
    );
  }

  // grace → expired + disable user account
  const toExpire = await DoctorSubscription.findAll({
    where: {
      status: "grace",
      grace_ends_at: { [Op.lte]: today },
    },
    include: [{ model: Doctor, as: "Doctor", include: [{ model: User }] }],
  });

  for (const sub of toExpire) {
    await sub.update({ status: "expired" });
    if (sub.Doctor?.User) {
      await sub.Doctor.User.update({ is_active: false });
      console.log(
        `[cron] Doctor ${sub.doctor_id} disabled — subscription expired`,
      );
    }
  }
});
