package com.memory.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "pao_codes")
public class PaoCode {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "number_string", nullable = false, unique = true, length = 2)
    private String numberString;

    @Column(nullable = false, length = 50)
    private String person;

    @Column(nullable = false, length = 50)
    private String action;

    @Column(nullable = false, length = 50)
    private String object;

    public PaoCode() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNumberString() { return numberString; }
    public void setNumberString(String numberString) { this.numberString = numberString; }
    public String getPerson() { return person; }
    public void setPerson(String person) { this.person = person; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getObject() { return object; }
    public void setObject(String object) { this.object = object; }
}
