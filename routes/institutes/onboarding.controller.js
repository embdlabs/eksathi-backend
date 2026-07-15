const instituteOnboarding = (req, res) => {
    const {
        aboutYou,
        address,
        board,
        dayboardingHostel,
        email,
        establishmentDate,
        facebook,
        github,
        instagram,
        instituteRegistrationNumber,
        linkdin,
        name,
        phoneNumber,
        studentsCount,
        teachersCount,
        twitter,
        website,
        youtube
    } = req.body;

    const query = `
        INSERT INTO institutes (
          about_you, address, board, dayboarding_hostel, email, establishment_date,
          facebook, github, instagram, registration_number, linkedin,
          name, phone_number, students_count, teachers_count,
          twitter, website, youtube
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;

    mysqlcon.query(
        query,
        [
            aboutYou, address, board, dayboardingHostel, email, establishmentDate,
            facebook, github, instagram, instituteRegistrationNumber, linkdin,
            name, phoneNumber, studentsCount, teachersCount,
            twitter, website, youtube
        ],
        (err, result) => {
            if (err) {
                console.error(err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                console.log('Institute onboarded:', result);
                res.status(201).json({ message: 'Institute onboarded successfully' });
            }
        }
    );
}

module.exports = {
    instituteOnboarding
}